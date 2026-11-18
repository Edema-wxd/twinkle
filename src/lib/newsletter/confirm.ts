import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { db, emailLogs, newsletterSubscribers } from '@/db'
import { sendEmail } from '@/lib/email/client'
import { escapeHtml } from '@/lib/email/orderTemplate'
import type { WelcomeOfferCode } from '@/lib/landing/welcomeOffer'
import { renderNewsletter, type NewsletterContent } from './template'
import { emailToken, siteUrl } from './unsubscribe'
import { describeExpiry, offerTerms, shopTwinklesUrl, welcomeCodeBlockHtml } from './welcomeCodeEmail'

/**
 * Double opt-in. Signing up saves the person unconfirmed and emails them a
 * link; only after they press "Yes, sign me up" on that page do they get the
 * welcome email and newsletters. This stops anyone signing up someone else
 * (or a bot filling the list with addresses that bounce and hurt delivery).
 */

export const CONFIRM_TEMPLATE_KEY = 'newsletter_confirm'
/** Backstop against the sign-up form being used to email strangers in bulk */
export const CONFIRM_HOURLY_LIMIT = 50
/** One confirmation email per address in this window, however often the form is sent */
const RESEND_AFTER_MS = 10 * 60 * 1000
/** Sign-ups nobody confirmed are deleted after this */
export const UNCONFIRMED_DAYS = 7

export function confirmUrl(email: string): string {
  const e = email.trim().toLowerCase()
  return `${siteUrl()}/newsletter/confirm?${new URLSearchParams({ e, t: emailToken('confirm', e) })}`
}

/** The confirmation email; with a welcome code, the code is in it too (usable before they confirm). */
function confirmationContent(to: string, offer?: WelcomeOfferCode): NewsletterContent {
  if (!offer) {
    return {
      subject: 'Confirm your Twinkle Locs newsletter sign-up',
      preheader: 'One tap and you’re in.',
      bodyHtml: `<p>Hi {name},</p><p>Thanks for joining the Twinkle Locs newsletter. Tap the button below to confirm it’s you, and we’ll send you new drops, loc care guides and the occasional offer.</p>`,
      ctaLabel: 'Confirm my email',
      ctaUrl: confirmUrl(to),
    }
  }
  const now = new Date()
  const { within } = describeExpiry(new Date(offer.expiresAt), now)
  return {
    subject: `Confirm your Twinkle Locs sign-up (your ${offer.percent}% code is inside)`,
    preheader: `Your code ${offer.code} works for ${within}.`,
    bodyHtml:
      `<p>Hi {name},</p><p>Thanks for joining Twinkle Locs. Here’s your welcome code:</p>${welcomeCodeBlockHtml(offer, now)}` +
      `<p>${escapeHtml(offerTerms(offer, now))} <a href="${escapeHtml(shopTwinklesUrl())}">Shop Twinkles</a></p>` +
      `<p>One more thing: tap the button below to confirm your email, and we’ll send you new drops, loc care guides and the occasional offer. Your code works either way.</p>`,
    ctaLabel: 'Confirm my email',
    ctaUrl: confirmUrl(to),
  }
}

/** Email the confirmation link (and the welcome code, when there is one). Never throws. */
export async function sendConfirmationEmail(email: string, firstName: string, offer?: WelcomeOfferCode): Promise<'sent' | 'recent' | 'throttled' | 'failed'> {
  const to = email.trim().toLowerCase()
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const [{ total, mine }] = await db
      .select({
        total: sql<number>`count(*)::int`,
        mine: sql<number>`count(*) filter (where ${to} = any(${emailLogs.to}) and ${emailLogs.createdAt} >= ${new Date(Date.now() - RESEND_AFTER_MS)})::int`,
      })
      .from(emailLogs)
      .where(and(eq(emailLogs.templateKey, CONFIRM_TEMPLATE_KEY), gte(emailLogs.createdAt, hourAgo)))
    if (Number(mine) > 0) return 'recent'
    if (Number(total) >= CONFIRM_HOURLY_LIMIT) {
      console.warn(`[newsletter] confirmation emails paused: ${total} sent in the last hour (limit ${CONFIRM_HOURLY_LIMIT})`)
      return 'throttled'
    }

    const { subject, html, text } = renderNewsletter(
      confirmationContent(to, offer),
      firstName,
      'Someone (hopefully you) entered this address to join the Twinkle Locs newsletter. If it wasn’t you, ignore this email and you won’t hear from us.',
    )
    const res = await sendEmail({
      to,
      subject,
      html,
      text,
      category: 'newsletter',
      templateKey: CONFIRM_TEMPLATE_KEY,
      // Same window as the check above, so a double submit can't send two
      idempotencyKey: `${CONFIRM_TEMPLATE_KEY}:${to}:${Math.floor(Date.now() / RESEND_AFTER_MS)}`,
    })
    return res.ok ? 'sent' : 'failed'
  } catch (err) {
    console.error('[newsletter] confirmation email failed:', err)
    return 'failed'
  }
}

/**
 * Mark the address confirmed. 'confirmed' only the first time, so the caller
 * sends the welcome email once; 'missing' when the sign-up was removed (expired
 * or unsubscribed).
 */
export async function confirmSubscriber(email: string): Promise<{ result: 'confirmed'; firstName: string } | { result: 'already' | 'missing' }> {
  const e = email.trim().toLowerCase()
  const [row] = await db
    .update(newsletterSubscribers)
    .set({ confirmedAt: new Date() })
    .where(and(eq(newsletterSubscribers.email, e), isNull(newsletterSubscribers.confirmedAt)))
    .returning({ firstName: newsletterSubscribers.firstName })
  if (row) return { result: 'confirmed', firstName: row.firstName }
  const [exists] = await db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers).where(eq(newsletterSubscribers.email, e)).limit(1)
  return { result: exists ? 'already' : 'missing' }
}

/** Forget sign-ups nobody confirmed (we keep nothing we can't use). Never throws. */
export async function deleteStaleUnconfirmed(): Promise<number> {
  try {
    const gone = await db
      .delete(newsletterSubscribers)
      .where(and(isNull(newsletterSubscribers.confirmedAt), lt(newsletterSubscribers.subscribedAt, new Date(Date.now() - UNCONFIRMED_DAYS * 86_400_000))))
      .returning({ id: newsletterSubscribers.id })
    return gone.length
  } catch (err) {
    console.error('[newsletter] failed to clear unconfirmed sign-ups:', err)
    return 0
  }
}
