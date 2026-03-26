import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import BinaryRain from '@/app/components/BinaryRain'
import SubscribeForm from '@/app/components/SubscribeForm'

export const dynamic = 'force-dynamic'

type Suggestion = {
  id: number
  meeting_id: number
  proposer_name: string
  suggested_topic: string
  has_article: boolean
  doi: string | null
  guide_preference:
    | 'guio_totalmente'
    | 'guio_com_outra_pessoa'
    | 'prefiro_outra_pessoa'
  status: 'em_analise' | 'confirmada' | 'recusada'
  notes: string | null
  created_at: string
}

type Meeting = {
  id: number
  meeting_date: string
  meeting_time: string
  topic: string | null
  status: 'em_aberto' | 'confirmada' | 'encerrada' | 'cancelada'
  notes: string | null
  article_title: string | null
  article_doi: string | null
  suggestions: Suggestion[]
}

type MeetingRow = Omit<Meeting, 'suggestions'>

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function meetingStatusLabel(status: Meeting['status']) {
  if (status === 'confirmada') return 'Confirmada'
  if (status === 'encerrada') return 'Encerrada'
  if (status === 'cancelada') return 'Cancelada'
  return 'Em aberto'
}

function meetingStatusClasses(status: Meeting['status']) {
  if (status === 'confirmada') {
    return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
  }

  if (status === 'encerrada') {
    return 'border-white/10 bg-white/5 text-white/70'
  }

  if (status === 'cancelada') {
    return 'border-red-400/30 bg-red-400/10 text-red-200'
  }

  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
}

function suggestionStatusLabel(status: Suggestion['status']) {
  if (status === 'confirmada') return 'Confirmada'
  if (status === 'recusada') return 'Recusada'
  return 'Em análise'
}

function guidePreferenceLabel(value: Suggestion['guide_preference']) {
  if (value === 'guio_totalmente') return 'Irá guiar a discussão'
  if (value === 'guio_com_outra_pessoa') return 'Irá guiar parcialmente'
  return 'Todos podem guiar a discussão'
}

function guidePreferenceClasses(value: Suggestion['guide_preference']) {
  if (value === 'guio_totalmente') {
    return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
  }

  if (value === 'guio_com_outra_pessoa') {
    return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  }

  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
}

async function getMeetings() {
  const [meetingsResponse, suggestionsResponse] = await Promise.all([
    supabase
      .from('meetings')
      .select(
        'id, meeting_date, meeting_time, topic, status, notes, article_title, article_doi'
      )
      .order('meeting_date', { ascending: true }),
    supabase.rpc('list_public_suggestions'),
  ])

  const error = meetingsResponse.error ?? suggestionsResponse.error

  if (error) {
    return { data: null, error }
  }

  const meetingRows = (meetingsResponse.data as MeetingRow[] | null) ?? []
  const publicSuggestions = (suggestionsResponse.data as Suggestion[] | null) ?? []

  const suggestionsByMeetingId = new Map<number, Suggestion[]>()

  for (const suggestion of publicSuggestions) {
    const current = suggestionsByMeetingId.get(suggestion.meeting_id) ?? []
    current.push(suggestion)
    suggestionsByMeetingId.set(suggestion.meeting_id, current)
  }

  const meetings: Meeting[] = meetingRows.map((meeting) => ({
    ...meeting,
    suggestions: suggestionsByMeetingId.get(meeting.id) ?? [],
  }))

  return { data: meetings, error: null }
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-white/50">Responsável pela sugestão</p>
          <p className="mt-1 text-base font-semibold text-white">
            {suggestion.proposer_name}
          </p>
          <p className="mt-2 text-xs text-white/45">
            Status da sugestão: {suggestionStatusLabel(suggestion.status)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs ${guidePreferenceClasses(suggestion.guide_preference)}`}
        >
          {guidePreferenceLabel(suggestion.guide_preference)}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/80">
        <div>
          <span className="text-white/50">Tema:</span> {suggestion.suggested_topic}
        </div>

        <div>
          <span className="text-white/50">Artigo:</span>{' '}
          {suggestion.has_article
            ? suggestion.doi && suggestion.doi.trim().length > 0
              ? `Sim • DOI: ${suggestion.doi}`
              : 'Sim'
            : 'Não informado'}
        </div>

        <div>
          <span className="text-white/50">Observação:</span>{' '}
          {suggestion.notes && suggestion.notes.trim().length > 0
            ? suggestion.notes
            : 'Nenhuma observação'}
        </div>
      </div>
    </div>
  )
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const title =
    meeting.topic && meeting.topic.trim().length > 0
      ? meeting.topic
      : meeting.status === 'cancelada'
        ? 'Reunião cancelada'
        : 'Sem tema definido'

  const suggestions = meeting.suggestions ?? []

  return (
    <details className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition hover:border-white/15">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/55">
              {formatDate(meeting.meeting_date)} • {formatTime(meeting.meeting_time)}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
          </div>

          <span
            className={`w-fit rounded-full border px-3 py-1 text-sm ${meetingStatusClasses(meeting.status)}`}
          >
            {meetingStatusLabel(meeting.status)}
          </span>
        </div>
      </summary>

      <div className="mt-4 space-y-4 border-t border-white/10 pt-4 text-sm text-white/80">
        <div>
          <span className="text-white/50">Tema:</span>{' '}
          {meeting.topic && meeting.topic.trim().length > 0
            ? meeting.topic
            : meeting.status === 'cancelada'
              ? 'Reunião cancelada'
              : 'Ainda em aberto para sugestões'}
        </div>

        <div>
          <span className="text-white/50">Observação:</span>{' '}
          {meeting.notes && meeting.notes.trim().length > 0
            ? meeting.notes
            : 'Nenhuma observação cadastrada'}
        </div>

        <div>
          <span className="text-white/50">Artigo:</span>{' '}
          {meeting.article_title && meeting.article_title.trim().length > 0
            ? meeting.article_title
            : 'Nenhum artigo definido'}
        </div>

        <div>
          <span className="text-white/50">DOI:</span>{' '}
          {meeting.article_doi && meeting.article_doi.trim().length > 0
            ? meeting.article_doi
            : 'Nenhum DOI definido'}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h4 className="text-base font-semibold text-white">Sugestões</h4>
            <span className="text-xs text-white/50">
              {suggestions.length} recebida(s)
            </span>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">Nenhuma sugestão até então.</p>
          )}

          {meeting.status === 'em_aberto' ? (
            <a
              href={`/sugerir/${meeting.id}`}
              className="mt-4 inline-flex rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Enviar sugestão para esta data
            </a>
          ) : (
            <p className="mt-4 text-sm text-white/50">
              Esta data não está aberta para novas sugestões.
            </p>
          )}
        </div>
      </div>
    </details>
  )
}

function YearButton({

  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  if (active) {
    return (
      <button className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
        {label}
      </button>
    )
  }

  return (
    <button
      disabled
      className="cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/35"
    >
      {label}
    </button>
  )
}

export default async function Home() {
  const { data, error } = await getMeetings()

  const meetings = ((data as Meeting[] | null) ?? []).map((meeting) => {
    if (meeting.meeting_date < new Date().toISOString().slice(0, 10) && meeting.status === 'em_aberto') {
      return {
        ...meeting,
        status: 'cancelada' as Meeting['status'],
      }
    }

    return meeting
  })

  const today = new Date().toISOString().slice(0, 10)

  const upcomingMeetings = meetings.filter(
    (meeting) => meeting.meeting_date >= today
  )

  const pastMeetings = meetings
    .filter((meeting) => meeting.meeting_date < today)
    .reverse()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_22%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#052e2b_100%)] text-white">
      <BinaryRain />
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-6 py-10 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_35%,rgba(34,211,238,0.03))]" />

          <div className="relative flex flex-col items-center justify-center gap-6 text-center">
            <a
              href="/login"
              className="absolute right-0 top-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Área administrativa
            </a>
            <div className="flex flex-col items-center justify-center gap-5 md:flex-row md:gap-6">
              <div className="relative flex h-52 w-52 items-center justify-center md:h-64 md:w-64">
                <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
                <div className="absolute inset-4 rounded-full bg-emerald-400/10 blur-[42px] animate-[pulse_8s_ease-in-out_infinite]" />
                <div className="relative rounded-full border border-white/10 bg-white/5 p-5 shadow-[0_0_60px_rgba(34,211,238,0.18)]">
                  <Image
                    src="/logo-bioinfo.png"
                    alt="Logo do grupo de pesquisa em Bioinformática e Biologia Computacional"
                    width={220}
                    height={220}
                    className="h-auto w-auto opacity-90 drop-shadow-[0_0_24px_rgba(255,255,255,0.14)]"
                    priority
                  />
                </div>
              </div>

              <div className="relative max-w-3xl">
                <div className="absolute inset-[-18px] rounded-[218px] rounded-[2rem] bg-cyan-400/6 blur-2xl" />
                <div className="absolute inset-x-6 inset-y-1 rounded-[1.75rem] bg-emerald-400/5 blur-xl" />

                <div className="relative rounded-[1.75rem] border border-white/8 bg-white/[0.04] px-6 py-4 backdrop-blur-[2px]">
                  <p className="text-balance text-xl font-semibold tracking-wide text-white md:text-3xl">
                    Grupo de Pesquisa em Bioinformática e Biologia Computacional
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Cronograma das reuniões
              </h1>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/75 backdrop-blur-md sm:text-base">
                  <p>
                    <span className="font-semibold text-white">Encontros presenciais:</span>{' '}
                    segundas-feiras às 14:00, na <span className="font-semibold text-cyan-100">Sala 3 do CPOM</span>{' '}
                    <span className="text-white/55">(ao lado da nossa sala de Bioinformática)</span>.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] px-5 py-4 text-left backdrop-blur-md">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                    Acesso online
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-white/75 sm:text-base">
                    <p>
                      <span className="font-semibold text-white">Link:</span>{' '}
                      <a
                        href="https://us02web.zoom.us/j/86303251576"
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 transition hover:text-cyan-100"
                      >
                        us02web.zoom.us/j/86303251576
                      </a>
                    </p>

                    <p>
                      <span className="font-semibold text-white">ID da reunião:</span>{' '}
                      863 0325 1576
                    </p>

                    <p className="text-white/60">
                      Por segurança, a senha não é disponibilizada aqui. Ela está descrita na descrição do grupo de WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <YearButton label="2026" active />
              <YearButton label="2027" />
              <YearButton label="2028" />
              <YearButton label="2029" />
              <YearButton label="2030" />
            </div>

            <SubscribeForm />
          </div>
        </header>

        {error ? (
          <div className="mt-10 rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-red-100">
            Erro ao carregar reuniões do Supabase: {error.message}
          </div>
        ) : (
          <>
            <section id="proximas" className="mt-14">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">Próximas reuniões</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">
                  {upcomingMeetings.length} data(s)
                </span>
              </div>

              <div className="grid gap-4">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                    Nenhuma próxima reunião encontrada.
                  </div>
                )}
              </div>
            </section>

            <section id="historico" className="mt-16">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">Histórico — reuniões passadas</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/50">
                  {pastMeetings.length} reunião(ões)
                </span>
              </div>

              <div className="grid gap-4">
                {pastMeetings.length > 0 ? (
                  pastMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                    Ainda não há reuniões no histórico.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
