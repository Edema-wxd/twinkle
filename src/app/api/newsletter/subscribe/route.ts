import { NextRequest, NextResponse, after } from 'next/server'
import { db } from '@/db'
import { newsletterSubscribers } from '@/db'
import { sendWelcomeEmail } from '@/lib/newsletter/welcome'
import { isUniqueViolation } from '@/lib/db/errors'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { first_name, email, source_page, website, elapsed_ms } = body as {
    first_name?: unknown
    email?: unknown
    source_page?: unknown
    /** Honeypot: a hidden field people never see but form-filling bots do */
    website?: unknown
    /** How long the form was open before it was sent (people take more than a second) */
    elapsed_ms?: unknown
  }

  // Looks automated: pretend it worked (so the bot learns nothing) but save and send nothing
  if ((typeof website === 'string' && website.trim() !== '') || (typeof elapsed_ms === 'number' && elapsed_ms < 1500)) {
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  try {
    const cleanEmail = email.trim().toLowerCase()
    const firstName = first_name.trim().slice(0, 80)
    await db.insert(newsletterSubscribers).values({
      firstName,
      email: cleanEmail,
      sourcePage: typeof source_page === 'string' ? source_page.slice(0, 300) : null,
    })
    // Welcome email after the response, so joining stays instant (only new subscribers reach here)
    after(() => sendWelcomeEmail(cleanEmail, firstName))
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'already subscribed' }, { status: 409 })
    }
    console.error('Newsletter subscribe error:', err)
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 })
  }
}
