import { createClient } from '@supabase/supabase-js'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServerKey = process.env.SUPABASE_SERVER_KEY!

  const supabase = createClient(supabaseUrl, supabaseServerKey)

  let success = false
  let message = 'Link inválido ou inscrição não encontrada.'

  if (token && token.trim().length > 0) {
    const { data, error } = await supabase
      .from('subscribers')
      .update({ is_active: false })
      .eq('unsubscribe_token', token)
      .eq('is_active', true)
      .select('id')
      .limit(1)

    if (!error && data && data.length > 0) {
      success = true
      message = 'Seu e-mail foi removido com sucesso da lista de notificações.'
    } else {
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id, is_active')
        .eq('unsubscribe_token', token)
        .limit(1)

      if (existing && existing.length > 0 && existing[0].is_active === false) {
        success = true
        message = 'Este e-mail já havia sido removido anteriormente.'
      }
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_22%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#052e2b_100%)] px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.18em] text-cyan-200/80">
            Reuniões Bioinfo
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Descadastro de notificações
          </h1>

          <div
            className={`mt-6 rounded-2xl border p-5 ${
              success
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-400/30 bg-red-400/10 text-red-100'
            }`}
          >
            {message}
          </div>

          <a
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
          >
            Voltar para o site
          </a>
        </div>
      </section>
    </main>
  )
}
