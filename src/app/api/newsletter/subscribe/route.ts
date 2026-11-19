import { NextRequest, NextResponse, after } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, newsletterSubscribers } from '@/db'
import { deleteStaleUnconfirmed, sendConfirmationEmail } from '@/lib/newsletter/confirm'
import { sendWelcomeCodeEmail } from '@/lib/newsletter/welcomeCodeEmail'
import { isUniqueViolation } from '@/lib/db/errors'
import { getLandingConfig } from '@/lib/landing/config.server'
import type { SubscribeResponse } from '@/lib/landing/welcomeOffer'
import { issueWelcomeCode, type WelcomeCodeResult } from '@/lib/promo/welcomeCode'

/**
 * Newsletter sign-up (double opt-in: newsletters only after the confirm link).
 *
 * With `offer: 'welcome'` (the ad landing page) and the offer switched on in
 * Admin, the visitor also gets their own one-use discount code straight away,
 * in the response and by email, confirmed or not. See lib/landing/welcomeOffer.ts
 * for the contract and lib/promo/welcomeCode.ts for who gets which code.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { first_name, email, source_page, website, elapsed_ms, offer } = body as {
    first_name?: unknown
    email?: unknown
    source_page?: unknown
    /** Honeypot: a hidden field people never see but form-filling bots do */
    website?: unknown
    /** How long the form was open before it was sent (people take more than a second) */
    elapsed_ms?: unknown
    /** 'welcome' = the visitor asked for the landing page's welcome code */
    offer?: unknown
  }

  // Looks automated: pretend it worked (so the bot learns nothing) but save and send nothing, and no code
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

  // 'new' = just added; 'pending' = signed up before, never confirmed; 'confirmed' = already on the list
  let state: 'new' | 'pending' | 'confirmed'
  let name = firstName
  try {
    // Saved unconfirmed: nothing is sent to them except the confirmation link (double opt-in)
    await db.insert(newsletterSubscribers).values({
      firstName,
      email: cleanEmail,
      sourcePage: typeof source_page === 'string' ? source_page.slice(0, 300) : null,
    })
    state = 'new'
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
    state = !existing || existing.confirmedAt ? 'confirmed' : 'pending'
    if (existing) name = existing.firstName
  }

  const welcome = offer === 'welcome' ? (await getLandingConfig()).welcomeOffer : null

  // No offer asked for, or it's switched off: the plain newsletter sign-up
  if (!welcome?.enabled) {
    if (state === 'confirmed') return NextResponse.json({ error: 'already subscribed' }, { status: 409 })
    if (state === 'pending') {
      // Signed up before but never confirmed: send the link again (rate-limited per address)
      after(() => sendConfirmationEmail(cleanEmail, name))
    } else {
      // After the response, so joining stays instant
      after(async () => {
        await sendConfirmationEmail(cleanEmail, name)
        await deleteStaleUnconfirmed()
      })
    }
    return NextResponse.json({ ok: true, pending: true }, { status: 201 })
  }

  let issued: WelcomeCodeResult | null = null
  try {
    issued = await issueWelcomeCode(cleanEmail, welcome)
  } catch (err) {
    console.error('[newsletter] welcome code failed:', err)
  }
  const code = issued && issued.status !== 'refused' ? issued.offer : undefined

  after(async () => {
    if (state !== 'confirmed') {
      const sent = await sendConfirmationEmail(cleanEmail, name, code)
      // A confirmation went out minutes ago (maybe from another page, without the code): send the code on its own
      if (code && sent === 'recent') await sendWelcomeCodeEmail(cleanEmail, name, code)
    } else if (code) {
      await sendWelcomeCodeEmail(cleanEmail, name, code)
    }
    if (state === 'new') await deleteStaleUnconfirmed()
  })

  if (!issued) {
    return NextResponse.json<SubscribeResponse>({ error: 'We couldn’t make your code just now. Please try again.' }, { status: 500 })
  }
  if (issued.status === 'refused') {
    return NextResponse.json<SubscribeResponse>({ error: issued.message }, { status: 409 })
  }
  const pending = state !== 'confirmed'
  return NextResponse.json<SubscribeResponse>({ ok: true, pending, offer: issued.offer }, { status: pending ? 201 : 200 })
}
