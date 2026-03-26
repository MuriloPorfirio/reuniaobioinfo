import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'E-mail inválido.' },
        { status: 400 }
      )
    }

    const unsubscribeToken = crypto.randomUUID()

    const { error } = await supabase.from('subscribers').insert({
      email,
      name: name.length > 0 ? name : null,
      unsubscribe_token: unsubscribeToken,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: true, message: 'Este e-mail já está cadastrado.' },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: 'Não foi possível salvar o cadastro.', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Requisição inválida.' },
      { status: 400 }
    )
  }
}
