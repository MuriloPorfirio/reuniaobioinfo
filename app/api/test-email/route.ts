import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME

  if (!apiKey || !senderEmail || !senderName) {
    return NextResponse.json(
      { error: 'Variáveis do Brevo não encontradas no .env.local' },
      { status: 500 }
    )
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: senderEmail,
          name: senderName,
        },
      ],
      subject: 'Teste de integração • Reuniões Bioinfo',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; background: #07111f; color: #e5f7ff; padding: 32px;">
          <div style="max-width: 640px; margin: 0 auto; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px;">
            <h1 style="margin-top: 0; color: #ffffff;">Teste de envio</h1>
            <p>Se você recebeu esta mensagem, a integração com o Brevo está funcionando.</p>
            <p style="margin-top: 20px;"><strong>Projeto:</strong> Reuniões Bioinfo</p>
            <p><strong>Status:</strong> envio de teste concluído</p>
          </div>
        </div>
      `,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Falha ao enviar e-mail', details: data },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}
