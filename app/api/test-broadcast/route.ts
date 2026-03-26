import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Subscriber = {
  id: number
  email: string
  name: string | null
  is_active: boolean
  unsubscribe_token: string
}

export async function GET() {
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
      { error: 'Faltam variáveis de ambiente para envio.' },
      { status: 500 }
    )
  }

  const normalizedSiteUrl = siteUrl.replace(/\/$/, '')
  const supabase = createClient(supabaseUrl, supabaseServerKey)

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, email, name, is_active, unsubscribe_token')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Não foi possível ler os inscritos.', details: error.message },
      { status: 500 }
    )
  }

  const subscribers = (data as Subscriber[] | null) ?? []

  if (subscribers.length === 0) {
    return NextResponse.json(
      { error: 'Não há inscritos ativos para testar.' },
      { status: 400 }
    )
  }

  const results: Array<{ email: string; success: boolean; details?: unknown }> = []

  for (const subscriber of subscribers) {
    const unsubscribeUrl = `${normalizedSiteUrl}/unsubscribe/${subscriber.unsubscribe_token}`

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
        subject: 'Teste de notificação • Reuniões Bioinfo',
        htmlContent: `
          <div style="margin:0;padding:0;background:#06111f;font-family:Arial,sans-serif;color:#e8f6ff;">
            <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
              <div style="border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);border-radius:24px;padding:32px;">
                <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8fe9ff;">
                  Reuniões Bioinfo
                </p>

                <h1 style="margin:0 0 18px 0;font-size:30px;line-height:1.2;color:#ffffff;">
                  Teste de envio para inscritos
                </h1>

                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#d6eef8;">
                  Olá${subscriber.name ? `, ${subscriber.name}` : ''}.
                </p>

                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#d6eef8;">
                  Se você recebeu esta mensagem, significa que o sistema de notificações por e-mail do site está funcionando.
                </p>

                <div style="margin-top:24px;border:1px solid rgba(143,233,255,0.18);background:rgba(143,233,255,0.05);border-radius:18px;padding:18px;">
                  <p style="margin:0 0 8px 0;font-size:15px;color:#ffffff;">
                    <strong>Este é apenas um teste.</strong>
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#cfeaf3;">
                    Nas próximas etapas, esse mesmo sistema vai enviar avisos reais quando uma reunião for confirmada ou cancelada.
                  </p>
                </div>

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
        `,
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
    total: subscribers.length,
    results,
  })
}
