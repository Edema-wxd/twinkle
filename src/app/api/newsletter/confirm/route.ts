import { NextRequest, NextResponse, after } from 'next/server'
import { verifyEmailToken } from '@/lib/newsletter/unsubscribe'
import { confirmSubscriber } from '@/lib/newsletter/confirm'
import { sendWelcomeEmail } from '@/lib/newsletter/welcome'

/**
 * POST only (from the button on /newsletter/confirm): email security scanners
 * open every link in an email, and that must not confirm a sign-up by itself.
 */
export async function POST(req: NextRequest) {
  let raw: { e?: unknown; t?: unknown } = {}
  try {
    raw = (await req.json()) as typeof raw
  } catch {
    /* falls through to invalid */
  }
  const email = typeof raw.e === 'string' ? raw.e.trim().toLowerCase() : ''
  const token = typeof raw.t === 'string' ? raw.t.trim() : ''
  if (!verifyEmailToken('confirm', email, token)) {
    return NextResponse.json({ error: 'This confirmation link isn’t valid. Join again from the bottom of any page on our site.' }, { status: 400 })
  }
  try {
    const r = await confirmSubscriber(email)
    if (r.result === 'missing') {
      return NextResponse.json({ error: 'This sign-up has expired. Join again from the bottom of any page on our site.' }, { status: 404 })
    }
    if (r.result === 'confirmed') after(() => sendWelcomeEmail(email, r.firstName))
    return NextResponse.json({ ok: true, already: r.result === 'already' })
  } catch (err) {
    console.error('[newsletter] confirm failed:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
