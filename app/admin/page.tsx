'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Suggestion = {
  id: number
  meeting_id: number
  proposer_name: string
  proposer_email: string | null
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
  meeting: {
    id: number
    meeting_date: string
    meeting_time: string
    topic: string | null
    status: 'em_aberto' | 'confirmada' | 'encerrada' | 'cancelada'
  } | null
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
  accepted_suggestion_id: number | null
}

type MeetingFormState = {
  topic: string
  notes: string
  article_title: string
  article_doi: string
  status: 'em_aberto' | 'confirmada' | 'encerrada' | 'cancelada'
}

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

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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

function suggestionStatusLabel(status: Suggestion['status']) {
  if (status === 'confirmada') return 'Confirmada'
  if (status === 'recusada') return 'Recusada'
  return 'Em análise'
}

function emptyToNull(value: string) {
  const cleaned = value.trim()
  return cleaned.length > 0 ? cleaned : null
}

export default function AdminPage() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null)
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null)
  const [meetingSaving, setMeetingSaving] = useState(false)
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>({
    topic: '',
    notes: '',
    article_title: '',
    article_doi: '',
    status: 'em_aberto',
  })

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToEditor() {
    const element = document.getElementById('meeting-editor')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function showSuccess(text: string) {
    setErrorMessage('')
    setMessage(text)
    scrollToTop()
  }

  function showError(text: string) {
    setMessage('')
    setErrorMessage(text)
    scrollToTop()
  }

  function openMeetingEditor(meeting: Meeting) {
    setSelectedSuggestionId(null)
    fillMeetingForm(meeting)
  }

  function fillMeetingForm(meeting: Meeting) {
    setSelectedMeetingId(meeting.id)
    setMeetingForm({
      topic: meeting.topic ?? '',
      notes: meeting.notes ?? '',
      article_title: meeting.article_title ?? '',
      article_doi: meeting.article_doi ?? '',
      status: meeting.status,
    })
  }

  function loadSuggestionIntoMeetingEditor(suggestion: Suggestion) {
    const meetingId = suggestion.meeting?.id ?? suggestion.meeting_id
    const baseMeeting = meetings.find((meeting) => meeting.id === meetingId)

    if (!baseMeeting) {
      setMessage('')
      setErrorMessage('Não foi possível localizar a reunião dessa sugestão.')
      return
    }

    setSelectedMeetingId(baseMeeting.id)
    setSelectedSuggestionId(suggestion.id)
    setMeetingForm({
      topic: suggestion.suggested_topic ?? baseMeeting.topic ?? '',
      notes: suggestion.notes ?? baseMeeting.notes ?? '',
      article_title: baseMeeting.article_title ?? '',
      article_doi: suggestion.doi ?? baseMeeting.article_doi ?? '',
      status: 'confirmada',
    })

    setErrorMessage('')
    setMessage('Dados da sugestão carregados no editor da reunião.')
    setTimeout(() => {
      scrollToEditor()
    }, 80)
  }

  function clearMeetingForm() {
    setSelectedMeetingId(null)
    setSelectedSuggestionId(null)
    setMeetingForm({
      topic: '',
      notes: '',
      article_title: '',
      article_doi: '',
      status: 'em_aberto',
    })
  }

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    const [suggestionsResponse, meetingsResponse] = await Promise.all([
      supabase
        .from('suggestions')
        .select(`
          id,
          meeting_id,
          proposer_name,
          proposer_email,
          suggested_topic,
          has_article,
          doi,
          guide_preference,
          status,
          notes,
          created_at,
          meeting:meetings!suggestions_meeting_id_fkey (
            id,
            meeting_date,
            meeting_time,
            topic,
            status
          )
        `)
        .order('meeting_id', { ascending: true })
        .order('created_at', { ascending: true }),

      supabase
        .from('meetings')
        .select(`
          id,
          meeting_date,
          meeting_time,
          topic,
          status,
          notes,
          article_title,
          article_doi,
          accepted_suggestion_id
        `)
        .order('meeting_date', { ascending: true }),
    ])

    const error = suggestionsResponse.error ?? meetingsResponse.error

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const loadedSuggestions = (suggestionsResponse.data as Suggestion[] | null) ?? []
    const loadedMeetings = (meetingsResponse.data as Meeting[] | null) ?? []

    setSuggestions(loadedSuggestions)
    setMeetings(loadedMeetings)
    setLoading(false)

    if (selectedMeetingId !== null) {
      const refreshedMeeting = loadedMeetings.find(
        (meeting) => meeting.id === selectedMeetingId
      )

      if (refreshedMeeting) {
        fillMeetingForm(refreshedMeeting)
      }
    }
  }

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSessionChecked(true)

      if (!session) {
        setLoading(false)
        return
      }

      setAdminEmail(session.user.email ?? '')
      await loadData()
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAdminEmail('')
        setSuggestions([])
        setMeetings([])
        setLoading(false)
        return
      }

      setAdminEmail(session.user.email ?? '')
      await loadData()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function approveSuggestion(suggestion: Suggestion) {
    setActionId(suggestion.id)
    setMessage('')
    setErrorMessage('')

    const currentMeeting = meetings.find(
      (meeting) => meeting.id === suggestion.meeting_id
    )

    if (!currentMeeting) {
      showError('Não foi possível localizar a reunião dessa sugestão.')
      setActionId(null)
      return
    }

    const { error: confirmSuggestionError } = await supabase
      .from('suggestions')
      .update({ status: 'confirmada' })
      .eq('id', suggestion.id)

    if (confirmSuggestionError) {
      showError(confirmSuggestionError.message)
      setActionId(null)
      return
    }

    if (
      currentMeeting.accepted_suggestion_id !== null &&
      currentMeeting.accepted_suggestion_id !== suggestion.id
    ) {
      const { error: rejectPreviouslyAcceptedSuggestionError } = await supabase
        .from('suggestions')
        .update({ status: 'recusada' })
        .eq('id', currentMeeting.accepted_suggestion_id)

      if (rejectPreviouslyAcceptedSuggestionError) {
        showError(rejectPreviouslyAcceptedSuggestionError.message)
        setActionId(null)
        return
      }
    }

    const { error: rejectOtherSuggestionsError } = await supabase
      .from('suggestions')
      .update({ status: 'recusada' })
      .eq('meeting_id', suggestion.meeting_id)
      .neq('id', suggestion.id)
      .eq('status', 'em_analise')

    if (rejectOtherSuggestionsError) {
      showError(rejectOtherSuggestionsError.message)
      setActionId(null)
      return
    }

    const { error: updateMeetingError } = await supabase
      .from('meetings')
      .update({
        topic: suggestion.suggested_topic,
        status: 'confirmada',
        article_doi: suggestion.doi,
        notes: suggestion.notes,
        accepted_suggestion_id: suggestion.id,
      })
      .eq('id', suggestion.meeting_id)

    if (updateMeetingError) {
      showError(updateMeetingError.message)
      setActionId(null)
      return
    }

    await loadData()
    showSuccess('Sugestão aprovada com sucesso.')
    setActionId(null)
  }

  async function rejectSuggestion(suggestionId: number) {
    setActionId(suggestionId)
    setMessage('')
    setErrorMessage('')

    const { error } = await supabase
      .from('suggestions')
      .update({ status: 'recusada' })
      .eq('id', suggestionId)

    if (error) {
      showError(error.message)
      setActionId(null)
      return
    }

    await loadData()
    showSuccess('Sugestão recusada com sucesso.')
    setActionId(null)
  }

  async function saveMeetingEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedMeetingId === null) {
      return
    }

    setMeetingSaving(true)
    setMessage('')
    setErrorMessage('')

    const payload: {
      topic: string | null
      notes: string | null
      article_title: string | null
      article_doi: string | null
      status: Meeting['status']
      accepted_suggestion_id?: number | null
    } = {
      topic: emptyToNull(meetingForm.topic),
      notes: emptyToNull(meetingForm.notes),
      article_title: emptyToNull(meetingForm.article_title),
      article_doi: emptyToNull(meetingForm.article_doi),
      status: meetingForm.status,
    }

    if (meetingForm.status === 'em_aberto') {
      payload.accepted_suggestion_id = null
    }

    const { error } = await supabase
      .from('meetings')
      .update(payload)
      .eq('id', selectedMeetingId)

    if (error) {
      showError(error.message)
      setMeetingSaving(false)
      return
    }

    await loadData()
    showSuccess('Reunião atualizada com sucesso.')
    setMeetingSaving(false)
  }

  async function saveAndApproveEditedSuggestion() {
    if (selectedMeetingId === null || selectedSuggestionId === null) {
      return
    }

    setMeetingSaving(true)
    setMessage('')
    setErrorMessage('')

    const { error: confirmSuggestionError } = await supabase
      .from('suggestions')
      .update({ status: 'confirmada' })
      .eq('id', selectedSuggestionId)

    if (confirmSuggestionError) {
      showError(confirmSuggestionError.message)
      setMeetingSaving(false)
      return
    }

    const { error: rejectOtherSuggestionsError } = await supabase
      .from('suggestions')
      .update({ status: 'recusada' })
      .eq('meeting_id', selectedMeetingId)
      .neq('id', selectedSuggestionId)
      .eq('status', 'em_analise')

    if (rejectOtherSuggestionsError) {
      showError(rejectOtherSuggestionsError.message)
      setMeetingSaving(false)
      return
    }

    const payload = {
      topic: emptyToNull(meetingForm.topic),
      notes: emptyToNull(meetingForm.notes),
      article_title: emptyToNull(meetingForm.article_title),
      article_doi: emptyToNull(meetingForm.article_doi),
      status: 'confirmada' as Meeting['status'],
      accepted_suggestion_id: selectedSuggestionId,
    }

    const { error: updateMeetingError } = await supabase
      .from('meetings')
      .update(payload)
      .eq('id', selectedMeetingId)

    if (updateMeetingError) {
      showError(updateMeetingError.message)
      setMeetingSaving(false)
      return
    }

    await loadData()
    setSelectedSuggestionId(null)
    showSuccess('Reunião salva e sugestão aprovada com sucesso.')
    setMeetingSaving(false)
  }

  async function reopenMeetingForSuggestions() {
    if (selectedMeetingId === null) {
      return
    }

    setMeetingSaving(true)
    setMessage('')
    setErrorMessage('')

    const currentMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId)

    if (!currentMeeting) {
      showError('Não foi possível localizar a reunião selecionada.')
      setMeetingSaving(false)
      return
    }

    if (currentMeeting.accepted_suggestion_id !== null) {
      const { error: reopenSuggestionError } = await supabase
        .from('suggestions')
        .update({ status: 'em_analise' })
        .eq('id', currentMeeting.accepted_suggestion_id)

      if (reopenSuggestionError) {
        showError(reopenSuggestionError.message)
        setMeetingSaving(false)
        return
      }
    }

    const { error: reopenMeetingError } = await supabase
      .from('meetings')
      .update({
        status: 'em_aberto',
        accepted_suggestion_id: null,
      })
      .eq('id', selectedMeetingId)

    if (reopenMeetingError) {
      showError(reopenMeetingError.message)
      setMeetingSaving(false)
      return
    }

    await loadData()
    setSelectedSuggestionId(null)
    setMeetingForm((current) => ({
      ...current,
      status: 'em_aberto',
    }))
    showSuccess('Reunião reaberta para novas sugestões.')
    setMeetingSaving(false)
  }

  const pendingSuggestions = useMemo(
    () => suggestions.filter((item) => item.status === 'em_analise'),
    [suggestions]
  )

  const reviewedSuggestions = useMemo(
    () => suggestions.filter((item) => item.status !== 'em_analise'),
    [suggestions]
  )

  const selectedMeeting =
    selectedMeetingId !== null
      ? meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null
      : null

  const selectedAcceptedSuggestion =
    selectedMeeting && selectedMeeting.accepted_suggestion_id !== null
      ? suggestions.find(
          (suggestion) => suggestion.id === selectedMeeting.accepted_suggestion_id
        ) ?? null
      : null

  const selectedMeetingSuggestions =
    selectedMeetingId !== null
      ? suggestions.filter((suggestion) => suggestion.meeting_id === selectedMeetingId)
      : []

  if (!sessionChecked) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            Verificando sessão...
          </div>
        </section>
      </main>
    )
  }

  if (!adminEmail) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h1 className="text-3xl font-bold">Área admin</h1>
            <p className="mt-3 text-white/70">
              Você precisa fazer login para acessar esta página.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950"
            >
              Ir para o login
            </a>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/50">Admin autenticado</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Painel de sugestões e reuniões
            </h1>
            <p className="mt-2 text-white/70">{adminEmail}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10"
            >
              Recarregar
            </button>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-white px-4 py-2 font-medium text-slate-950"
            >
              Sair
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        )}

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Sugestões em análise</h2>
            <span className="text-sm text-white/50">
              {pendingSuggestions.length} pendente(s)
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              Carregando...
            </div>
          ) : pendingSuggestions.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
              Nenhuma sugestão pendente no momento.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm text-white/50">Data da reunião</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">
                        {suggestion.meeting
                          ? `${formatDate(suggestion.meeting.meeting_date)} • ${formatTime(suggestion.meeting.meeting_time)}`
                          : 'Reunião não encontrada'}
                      </h3>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs ${guidePreferenceClasses(suggestion.guide_preference)}`}
                    >
                      {guidePreferenceLabel(suggestion.guide_preference)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/50">Responsável pela sugestão</p>
                      <p className="mt-1 font-semibold text-white">
                        {suggestion.proposer_name}
                      </p>

                      <p className="mt-4 text-sm text-white/50">E-mail privado</p>
                      <p className="mt-1 text-white/85">
                        {suggestion.proposer_email && suggestion.proposer_email.trim().length > 0
                          ? suggestion.proposer_email
                          : 'Não informado'}
                      </p>

                      <p className="mt-4 text-sm text-white/50">Enviado em</p>
                      <p className="mt-1 text-white/85">
                        {formatCreatedAt(suggestion.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/50">Tema sugerido</p>
                      <p className="mt-1 font-semibold text-white">
                        {suggestion.suggested_topic}
                      </p>

                      <p className="mt-4 text-sm text-white/50">Artigo / DOI</p>
                      <p className="mt-1 text-white/85">
                        {suggestion.has_article
                          ? suggestion.doi && suggestion.doi.trim().length > 0
                            ? suggestion.doi
                            : 'Artigo indicado, mas sem DOI preenchido'
                          : 'Nenhum artigo informado'}
                      </p>

                      <p className="mt-4 text-sm text-white/50">Observações</p>
                      <p className="mt-1 text-white/85">
                        {suggestion.notes && suggestion.notes.trim().length > 0
                          ? suggestion.notes
                          : 'Nenhuma observação'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => approveSuggestion(suggestion)}
                      disabled={actionId === suggestion.id}
                      className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === suggestion.id ? 'Processando...' : 'Aprovar tema'}
                    </button>

                    <button
                      onClick={() => loadSuggestionIntoMeetingEditor(suggestion)}
                      disabled={actionId === suggestion.id}
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Editar antes de aprovar
                    </button>

                    <button
                      onClick={() => rejectSuggestion(suggestion.id)}
                      disabled={actionId === suggestion.id}
                      className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === suggestion.id ? 'Processando...' : 'Recusar'}
                    </button>

                    <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      Status atual: {suggestionStatusLabel(suggestion.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="meeting-editor" className="mt-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Editor de reuniões</h2>
            <span className="text-sm text-white/50">
              {meetings.length} reunião(ões)
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  Carregando...
                </div>
              ) : meetings.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
                  Nenhuma reunião encontrada.
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm text-white/50">
                          {formatDate(meeting.meeting_date)} • {formatTime(meeting.meeting_time)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {meeting.topic && meeting.topic.trim().length > 0
                            ? meeting.topic
                            : 'Sem tema definido'}
                        </h3>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-sm ${meetingStatusClasses(meeting.status)}`}
                      >
                        {meetingStatusLabel(meeting.status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-white/75">
                      <div>
                        <span className="text-white/50">Observação:</span>{' '}
                        {meeting.notes && meeting.notes.trim().length > 0
                          ? meeting.notes
                          : 'Nenhuma observação'}
                      </div>

                      <div>
                        <span className="text-white/50">Artigo:</span>{' '}
                        {meeting.article_title && meeting.article_title.trim().length > 0
                          ? meeting.article_title
                          : 'Nenhum título definido'}
                      </div>

                      <div>
                        <span className="text-white/50">DOI:</span>{' '}
                        {meeting.article_doi && meeting.article_doi.trim().length > 0
                          ? meeting.article_doi
                          : 'Nenhum DOI definido'}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => openMeetingEditor(meeting)}
                        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10"
                      >
                        Editar reunião
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/50">Painel lateral</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">
                      {selectedMeeting
                        ? `${formatDate(selectedMeeting.meeting_date)} • ${formatTime(selectedMeeting.meeting_time)}`
                        : 'Selecione uma reunião'}
                    </h3>
                  </div>

                  {selectedMeetingId !== null && (
                    <button
                      onClick={clearMeetingForm}
                      className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Fechar
                    </button>
                  )}
                </div>

                {selectedMeeting ? (
                  <>
                    {selectedSuggestionId !== null && (
                      <div className="mt-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-cyan-100">
                        Você está editando esta reunião com base em uma sugestão pendente.
                        Revise os campos e, se quiser fechar o fluxo de uma vez, use
                        <strong> Salvar e aprovar esta sugestão</strong>.
                      </div>
                    )}

                    {selectedAcceptedSuggestion && (
                      <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
                        <p className="font-semibold">Sugestão atualmente aceita</p>
                        <p className="mt-2">
                          <span className="text-emerald-200/80">Responsável:</span>{' '}
                          {selectedAcceptedSuggestion.proposer_name}
                        </p>
                        <p className="mt-1">
                          <span className="text-emerald-200/80">Tema:</span>{' '}
                          {selectedAcceptedSuggestion.suggested_topic}
                        </p>
                        <p className="mt-1">
                          <span className="text-emerald-200/80">Status:</span>{' '}
                          {suggestionStatusLabel(selectedAcceptedSuggestion.status)}
                        </p>
                      </div>
                    )}

                    {selectedMeetingSuggestions.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-sm font-medium text-white/70">
                          Sugestões desta reunião
                        </p>

                        <div className="space-y-3">
                          {selectedMeetingSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.id}
                              className="rounded-2xl border border-white/10 bg-black/20 p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-sm text-white/50">
                                    Responsável pela sugestão
                                  </p>
                                  <p className="mt-1 font-semibold text-white">
                                    {suggestion.proposer_name}
                                  </p>
                                  <p className="mt-2 text-xs text-white/45">
                                    Status: {suggestionStatusLabel(suggestion.status)}
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
                                  <span className="text-white/50">Tema:</span>{' '}
                                  {suggestion.suggested_topic}
                                </div>

                                <div>
                                  <span className="text-white/50">DOI:</span>{' '}
                                  {suggestion.doi && suggestion.doi.trim().length > 0
                                    ? suggestion.doi
                                    : 'Nenhum DOI informado'}
                                </div>

                                <div>
                                  <span className="text-white/50">Observação:</span>{' '}
                                  {suggestion.notes && suggestion.notes.trim().length > 0
                                    ? suggestion.notes
                                    : 'Nenhuma observação'}
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => loadSuggestionIntoMeetingEditor(suggestion)}
                                  className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                                >
                                  Carregar no editor
                                </button>

                                {selectedMeeting?.accepted_suggestion_id !== suggestion.id && (
                                  <button
                                    type="button"
                                    onClick={() => approveSuggestion(suggestion)}
                                    disabled={actionId === suggestion.id}
                                    className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {actionId === suggestion.id
                                      ? 'Processando...'
                                      : 'Tornar esta a sugestão aceita'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <form onSubmit={saveMeetingEdits} className="mt-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Tema
                      </label>
                      <input
                        value={meetingForm.topic}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            topic: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                        placeholder="Tema da reunião"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Status
                      </label>
                      <select
                        value={meetingForm.status}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            status: event.target.value as Meeting['status'],
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                      >
                        <option value="em_aberto">Em aberto</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="encerrada">Encerrada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Título do artigo
                      </label>
                      <input
                        value={meetingForm.article_title}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            article_title: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                        placeholder="Nome do artigo principal"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        DOI
                      </label>
                      <input
                        value={meetingForm.article_doi}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            article_doi: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                        placeholder="10.xxxx/xxxxx"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Observação
                      </label>
                      <textarea
                        rows={5}
                        value={meetingForm.notes}
                        onChange={(event) =>
                          setMeetingForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
                        placeholder="Observações públicas sobre a reunião"
                      />
                    </div>

                    <p className="text-sm text-white/55">
                      Você pode usar <strong>Editar antes de aprovar</strong> para
                      carregar os dados de uma sugestão aqui, revisar, completar o título
                      do artigo e depois salvar.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {selectedSuggestionId !== null && (
                        <button
                          type="button"
                          onClick={saveAndApproveEditedSuggestion}
                          disabled={meetingSaving}
                          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {meetingSaving ? 'Processando...' : 'Salvar e aprovar esta sugestão'}
                        </button>
                      )}

                      {selectedMeeting?.accepted_suggestion_id !== null && (
                        <button
                          type="button"
                          onClick={reopenMeetingForSuggestions}
                          disabled={meetingSaving}
                          className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {meetingSaving ? 'Processando...' : 'Reabrir para sugestões'}
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={meetingSaving}
                        className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {meetingSaving ? 'Salvando...' : 'Salvar reunião'}
                      </button>

                      <button
                        type="button"
                        onClick={clearMeetingForm}
                        className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                  </>
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
                    Clique em <strong>Editar reunião</strong> em qualquer item da lista
                    ou em <strong>Editar antes de aprovar</strong> em uma sugestão para
                    abrir o formulário de edição.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Sugestões já revisadas</h2>
            <span className="text-sm text-white/50">
              {reviewedSuggestions.length} revisada(s)
            </span>
          </div>

          {reviewedSuggestions.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
              Ainda não há sugestões confirmadas ou recusadas.
            </div>
          ) : (
            <div className="grid gap-4">
              {reviewedSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-white/50">Reunião</p>
                      <p className="mt-1 font-semibold text-white">
                        {suggestion.meeting
                          ? `${formatDate(suggestion.meeting.meeting_date)} • ${formatTime(suggestion.meeting.meeting_time)}`
                          : 'Reunião não encontrada'}
                      </p>
                      <p className="mt-2 text-white/75">{suggestion.suggested_topic}</p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/75">
                      {suggestionStatusLabel(suggestion.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
