import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

export default async function SuggestionPage(props: any) {
  const params = await props.params
  const searchParams = await props.searchParams

  const meetingId = Number(params.id)

  if (!Number.isFinite(meetingId)) {
    notFound()
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('id, meeting_date, meeting_time, topic, status')
    .eq('id', meetingId)
    .single()

  if (error || !meeting) {
    notFound()
  }

  async function submitSuggestion(formData: FormData) {
    'use server'

    const meetingId = Number(formData.get('meeting_id'))
    const proposerName = String(formData.get('proposer_name') || '').trim()
    const suggestedTopic = String(formData.get('suggested_topic') || '').trim()
    const guidePreference = String(formData.get('guide_preference') || '').trim()
    const proposerEmail = String(formData.get('proposer_email') || '').trim()
    const notes = String(formData.get('notes') || '').trim()
    const hasArticle = formData.get('has_article') === 'on'
    const doiRaw = String(formData.get('doi') || '').trim()
    const doi = hasArticle && doiRaw.length > 0 ? doiRaw : null

    if (!proposerName || !suggestedTopic || !guidePreference) {
      redirect(`/sugerir/${meetingId}?erro=Preencha%20os%20campos%20obrigatorios`)
    }

    const { error } = await supabase.from('suggestions').insert({
      meeting_id: meetingId,
      proposer_name: proposerName,
      proposer_email: proposerEmail.length > 0 ? proposerEmail : null,
      suggested_topic: suggestedTopic,
      has_article: hasArticle,
      doi,
      guide_preference: guidePreference,
      notes: notes.length > 0 ? notes : null,
      status: 'em_analise',
    })

    if (error) {
      redirect(`/sugerir/${meetingId}?erro=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/')
    revalidatePath(`/sugerir/${meetingId}`)

    redirect(`/sugerir/${meetingId}?sucesso=1`)
  }

  const success = searchParams?.sucesso === '1'
  const errorMessage =
    typeof searchParams?.erro === 'string' ? searchParams.erro : ''

  const meetingIsOpen = meeting.status === 'em_aberto'

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <a
          href="/"
          className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/10"
        >
          ← Voltar para o cronograma
        </a>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-sm text-white/60">
            {formatDate(meeting.meeting_date)} • {formatTime(meeting.meeting_time)}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Enviar sugestão
          </h1>

          <p className="mt-3 text-white/75">
            {meeting.topic && meeting.topic.trim().length > 0
              ? `Tema atual: ${meeting.topic}`
              : 'Esta reunião ainda está em aberto para sugestões.'}
          </p>

          {!meetingIsOpen && (
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
              Esta data não está aberta para novas sugestões.
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
              Sugestão enviada com sucesso.
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
              Erro ao enviar: {errorMessage}
            </div>
          )}
        </div>

        {meetingIsOpen && (
          <form action={submitSuggestion} className="mt-8 space-y-6">
            <input type="hidden" name="meeting_id" value={meeting.id} />

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-2 block text-sm font-medium text-white">
                Seu nome *
              </label>
              <input
                name="proposer_name"
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                placeholder="Digite seu nome"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-2 block text-sm font-medium text-white">
                Tema sugerido *
              </label>
              <input
                name="suggested_topic"
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                placeholder="Ex.: Single-cell RNA-seq na prática"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-3 block text-sm font-medium text-white">
                Há artigo de referência?
              </label>

              <label className="flex items-center gap-3 text-white/80">
                <input type="checkbox" name="has_article" className="h-4 w-4" />
                Sim, quero indicar um artigo
              </label>

              <label className="mt-4 mb-2 block text-sm font-medium text-white">
                DOI do artigo
              </label>
              <input
                name="doi"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                placeholder="Ex.: 10.1038/s41586-023-00000-0"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-2 block text-sm font-medium text-white">
                Você poderia guiar a discussão? *
              </label>

              <select
                name="guide_preference"
                required
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              >
                <option value="" disabled>
                  Selecione uma opção
                </option>
                <option value="guio_totalmente">Sim, eu guiaria a discussão</option>
                <option value="guio_com_outra_pessoa">
                  Parcialmente, gostaria de ajuda
                </option>
                <option value="prefiro_outra_pessoa">
                  Não gostaria de guiar
                </option>
              </select>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-2 block text-sm font-medium text-white">
                Seu e-mail
              </label>
              <input
                name="proposer_email"
                type="email"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                placeholder="nome@exemplo.com"
              />
              <p className="mt-2 text-sm text-white/55">
                O e-mail não ficará público. Se a sugestão for aceita, você poderá
                ser avisado por e-mail.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <label className="mb-2 block text-sm font-medium text-white">
                Observações
              </label>
              <textarea
                name="notes"
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                placeholder="Informações adicionais, contexto, observações sobre o tema..."
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Enviar sugestão
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
