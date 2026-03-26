import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Meeting = {
  id: number
  meeting_date: string
  meeting_time: string
  topic: string | null
  status: 'em_aberto' | 'confirmada' | 'encerrada' | 'cancelada'
  notes: string | null
  article_title: string | null
  article_doi: string | null
}

type Subscriber = {
  id: number
  email: string
  name: string | null
  unsubscribe_token: string
}

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const meetingId = Number(id)

  if (!Number.isFinite(meetingId)) {
    return NextResponse.json(
      { error: 'ID de reunião inválido.' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServerKey = process.env.SUPABASE_SERVER_KEY
  const brevoApiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (
    !supabaseUrl ||
    !supabaseServerKey ||
    !brevoApiKey ||
    !senderEmail ||
    !senderName ||
    !siteUrl
  ) {
    return NextResponse.json(
      { error: 'Faltam variáveis de ambiente.' },
      { status: 500 }
    )
  }

  const normalizedSiteUrl = siteUrl.replace(/\/$/, '')
  const supabase = createClient(supabaseUrl, supabaseServerKey)

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(
      'id, meeting_date, meeting_time, topic, status, notes, article_title, article_doi'
    )
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return NextResponse.json(
      { error: 'Reunião não encontrada.', details: meetingError?.message },
      { status: 404 }
    )
  }

  const typedMeeting = meeting as Meeting

  if (
    typedMeeting.status !== 'confirmada' &&
    typedMeeting.status !== 'cancelada'
  ) {
    return NextResponse.json(
      {
        error:
          'Só é possível enviar aviso para reuniões confirmadas ou canceladas.',
      },
      { status: 400 }
    )
  }

  const { data: subscribers, error: subscribersError } = await supabase
    .from('subscribers')
    .select('id, email, name, unsubscribe_token')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (subscribersError) {
    return NextResponse.json(
      {
        error: 'Não foi possível carregar os inscritos.',
        details: subscribersError.message,
      },
      { status: 500 }
    )
  }

  const activeSubscribers = (subscribers as Subscriber[] | null) ?? []

  if (activeSubscribers.length === 0) {
    return NextResponse.json(
      { error: 'Não há inscritos ativos para receber o aviso.' },
      { status: 400 }
    )
  }

  const isConfirmed = typedMeeting.status === 'confirmada'
  const subject = isConfirmed
    ? `Reunião confirmada • ${formatDate(typedMeeting.meeting_date)}`
    : `Reunião cancelada • ${formatDate(typedMeeting.meeting_date)}`

  const statusBadgeLabel = isConfirmed ? 'Reunião confirmada' : 'Reunião cancelada'
  const statusBadgeStyle = isConfirmed
    ? 'border:1px solid rgba(45,212,191,0.25);background:rgba(45,212,191,0.10);color:#c8fff4;'
    : 'border:1px solid rgba(248,113,113,0.25);background:rgba(248,113,113,0.10);color:#ffe2e2;'

  const results: Array<{ email: string; success: boolean; details?: unknown }> = []

  for (const subscriber of activeSubscribers) {
    const unsubscribeUrl = `${normalizedSiteUrl}/unsubscribe/${subscriber.unsubscribe_token}`

    const htmlContent = `
      <div style="margin:0;padding:0;background:#06111f;font-family:Arial,sans-serif;color:#e8f6ff;">
        <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
          <div style="border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);border-radius:24px;padding:32px;">
            <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8fe9ff;">
              Reuniões Bioinfo
            </p>

            <h1 style="margin:0 0 16px 0;font-size:30px;line-height:1.2;color:#ffffff;">
              ${isConfirmed ? 'Uma reunião foi confirmada' : 'Uma reunião foi cancelada'}
            </h1>

            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#d6eef8;">
              Olá${subscriber.name ? `, ${subscriber.name}` : ''}.
            </p>

            <div style="display:inline-block;padding:10px 14px;border-radius:999px;${statusBadgeStyle}font-size:13px;font-weight:700;">
              ${statusBadgeLabel}
            </div>

            <div style="margin-top:24px;border:1px solid rgba(143,233,255,0.18);background:rgba(143,233,255,0.05);border-radius:18px;padding:20px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Data:</strong> ${formatDate(typedMeeting.meeting_date)}
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Horário:</strong> ${formatTime(typedMeeting.meeting_time)}
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Local presencial:</strong> Sala 3 do CPOM (ao lado da sala de Bioinformática)
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Link online:</strong>
                <a href="https://us02web.zoom.us/j/86303251576" style="color:#8fe9ff;text-decoration:underline;">
                  us02web.zoom.us/j/86303251576
                </a>
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>ID da reunião:</strong> 863 0325 1576
              </p>
              <p style="margin:0;font-size:15px;color:#ffffff;">
                <strong>Senha do Zoom:</strong> 895033
              </p>
            </div>

            ${
              isConfirmed
                ? `
            <div style="margin-top:24px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);border-radius:18px;padding:20px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Tema:</strong> ${typedMeeting.topic && typedMeeting.topic.trim().length > 0 ? typedMeeting.topic : 'Tema não informado'}
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Observação:</strong> ${typedMeeting.notes && typedMeeting.notes.trim().length > 0 ? typedMeeting.notes : 'Nenhuma observação cadastrada'}
              </p>
              <p style="margin:0 0 10px 0;font-size:15px;color:#ffffff;">
                <strong>Artigo:</strong> ${typedMeeting.article_title && typedMeeting.article_title.trim().length > 0 ? typedMeeting.article_title : 'Nenhum artigo definido'}
              </p>
              <p style="margin:0;font-size:15px;color:#ffffff;">
                <strong>DOI:</strong> ${typedMeeting.article_doi && typedMeeting.article_doi.trim().length > 0 ? typedMeeting.article_doi : 'Nenhum DOI definido'}
              </p>
            </div>
                `
                : `
            <div style="margin-top:24px;border:1px solid rgba(248,113,113,0.18);background:rgba(248,113,113,0.05);border-radius:18px;padding:20px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#ffe8e8;">
                Esta reunião não acontecerá na data prevista. Consulte o site para acompanhar atualizações futuras do cronograma.
              </p>
            </div>
                `
            }

            <div style="margin-top:28px;">
              <a
                href="${unsubscribeUrl}"
                style="display:inline-block;background:#14b8a6;color:#041014;text-decoration:none;padding:12px 18px;border-radius:14px;font-weight:700;"
              >
                Cancelar recebimento destes e-mails
              </a>
            </div>

            <p style="margin:22px 0 0 0;font-size:12px;line-height:1.6;color:#9ec6d3;">
              Se você está recebendo este e-mail, é porque seu endereço foi cadastrado no site. Caso não deseje receber novos avisos, use o botão acima para sair da lista.
            </p>
          </div>
        </div>
      </div>
    `

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [
          {
            email: subscriber.email,
            name: subscriber.name || subscriber.email,
          },
        ],
        subject,
        htmlContent,
      }),
    })

    const responseData = await response.json()

    results.push({
      email: subscriber.email,
      success: response.ok,
      details: responseData,
    })
  }

  return NextResponse.json({
    success: true,
    meetingId: typedMeeting.id,
    meetingStatus: typedMeeting.status,
    total: activeSubscribers.length,
    results,
  })
}
