import { NextRequest, NextResponse, after } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, newsletterSubscribers } from '@/db'
import { deleteStaleUnconfirmed, sendConfirmationEmail } from '@/lib/newsletter/confirm'
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
    return NextResponse.json({ ok: true, pending: true }, { status: 201 })
  }

  if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase().slice(0, 254)
  const firstName = first_name.trim().slice(0, 80)

  try {
    // Saved unconfirmed: nothing is sent to them except the confirmation link (double opt-in)
    await db.insert(newsletterSubscribers).values({
      firstName,
      email: cleanEmail,
      sourcePage: typeof source_page === 'string' ? source_page.slice(0, 300) : null,
    })
  } catch (err: unknown) {
    if (!isUniqueViolation(err)) {
      console.error('Newsletter subscribe error:', err)
      return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 })
    }
    const [existing] = await db
      .select({ confirmedAt: newsletterSubscribers.confirmedAt, firstName: newsletterSubscribers.firstName })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, cleanEmail))
      .limit(1)
      .catch(() => [])
    if (!existing || existing.confirmedAt) {
      return NextResponse.json({ error: 'already subscribed' }, { status: 409 })
    }
    // Signed up before but never confirmed: send the link again (rate-limited per address)
    after(() => sendConfirmationEmail(cleanEmail, existing.firstName))
    return NextResponse.json({ ok: true, pending: true }, { status: 201 })
  }

  // After the response, so joining stays instant
  after(async () => {
    await sendConfirmationEmail(cleanEmail, firstName)
    await deleteStaleUnconfirmed()
  })
  return NextResponse.json({ ok: true, pending: true }, { status: 201 })
}
