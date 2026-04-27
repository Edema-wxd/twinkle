import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { newsletterSubscribers } from '@/db'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { first_name, email, source_page } = body as {
    first_name?: unknown
    email?: unknown
    source_page?: unknown
  }

  if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  try {
    await db.insert(newsletterSubscribers).values({
      firstName: first_name.trim(),
      email: email.trim().toLowerCase(),
      sourcePage: typeof source_page === 'string' ? source_page : null,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'already subscribed' }, { status: 409 })
    }
    console.error('Newsletter subscribe error:', err)
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 })
  }
}
