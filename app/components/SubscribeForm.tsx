'use client'

import { FormEvent, useState } from 'react'

export default function SubscribeForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Não foi possível realizar o cadastro.')
        setLoading(false)
        return
      }

      setMessage(data.message || 'Cadastro realizado com sucesso.')
      setName('')
      setEmail('')
      setLoading(false)
    } catch {
      setError('Erro de conexão ao tentar cadastrar o e-mail.')
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Receber avisos por e-mail
        </h3>
        <p className="mt-2 text-sm text-white/65">
          Cadastre seu e-mail para receber notificações quando uma reunião for
          confirmada ou cancelada.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr,1.2fr,auto]">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome (opcional)"
          className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
        />

        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Seu e-mail"
          className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-white/45">
        Você poderá cancelar o recebimento futuramente por um link no próprio e-mail.
      </p>
    </div>
  )
}
