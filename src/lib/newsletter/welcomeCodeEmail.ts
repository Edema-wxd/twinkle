import { and, eq, gte, like, sql } from 'drizzle-orm'
import { db, emailLogs } from '@/db'
import { sendEmail } from '@/lib/email/client'
import { escapeHtml } from '@/lib/email/orderTemplate'
import { LANDING_PATH } from '@/lib/landing/config'
import type { WelcomeOfferCode } from '@/lib/landing/welcomeOffer'
import { formatNgn } from '@/lib/promo/minOrder'
import { SHOP_TIME_ZONE } from '@/lib/time/lagos'
import { renderNewsletter } from './template'
import { siteUrl } from './unsubscribe'

/**
 * Emailing a landing page sign-up their one-use welcome code.
 *
 * Usually the code rides in the confirmation email (see sendConfirmationEmail),
 * so people get one email. This short email is for when no confirmation goes
 * out: they're already confirmed, or a confirmation went to them minutes ago.
 */

export const WELCOME_CODE_TEMPLATE_KEY = 'welcome_code'
/** Backstop against the sign-up form being used to email strangers in bulk */
export const WELCOME_CODE_HOURLY_LIMIT = 50
/** The same code isn't emailed to the same address twice in this window, however often the form is sent */
const RESEND_AFTER_MS = 10 * 60 * 1000

export const shopTwinklesUrl = () => `${siteUrl()}${LANDING_PATH}`

/** Wall-clock date in Lagos, for "today" / "tomorrow" */
const lagosDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/**
 * How long the code has left, in words, and when it stops working (Lagos time):
 * { within: 'the next 6 hours', until: '4:30pm' }, with 'tomorrow' or the date
 * added when it ends on another day.
 */
export function describeExpiry(expiresAt: Date, now: Date = new Date()): { within: string; until: string } {
  const minutes = Math.max(1, Math.round((expiresAt.getTime() - now.getTime()) / 60_000))
  const hours = Math.round(minutes / 60)
  const within =
    minutes < 60
      ? `the next ${minutes === 1 ? 'minute' : `${minutes} minutes`}`
      : hours < 48
        ? `the next ${hours === 1 ? 'hour' : `${hours} hours`}`
        : `the next ${Math.round(hours / 24)} days`

  const time = new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(expiresAt)
    .replace(/\s/g, '')
    .toLowerCase()
  const day = lagosDate(expiresAt)
  const tomorrow = lagosDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  const until =
    day === lagosDate(now)
      ? time
      : day === tomorrow
        ? `${time} tomorrow`
        : `${time} on ${new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'long' }).format(expiresAt)}`
  return { within, until }
}

/** "It takes 10% off and works once at checkout, for the next 6 hours (until 4:30pm), on orders of ₦100,000 or more before delivery." */
export function offerTerms(offer: WelcomeOfferCode, now: Date = new Date()): string {
  const { within, until } = describeExpiry(new Date(offer.expiresAt), now)
  const minimum = offer.minOrder > 0 ? `, on orders of ${formatNgn(offer.minOrder)} or more before delivery` : ''
  return `It takes ${offer.percent}% off and works once at checkout, for ${within} (until ${until})${minimum}.`
}

/** The boxed code, for the body of an email rendered with renderNewsletter() */
export function welcomeCodeBlockHtml(offer: WelcomeOfferCode, now: Date = new Date()): string {
  const { until } = describeExpiry(new Date(offer.expiresAt), now)
  const summary = [
    offer.minOrder > 0 ? `${offer.percent}% off orders of ${formatNgn(offer.minOrder)}+` : `${offer.percent}% off`,
    'one use',
    `until ${until}`,
  ].join(' · ')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 20px 0;"><tr><td style="border:2px dashed #C9A96E;border-radius:10px;background-color:#FAF8F4;padding:18px 16px;text-align:center;">
<p style="margin:0 0 6px 0;font-size:12px;color:#78716c;letter-spacing:0.08em;text-transform:uppercase;">Your code</p>
<p style="margin:0 0 6px 0;font-size:26px;font-weight:700;color:#1A3C34;letter-spacing:0.1em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${escapeHtml(offer.code)}</p>
<p style="margin:0;font-size:13px;color:#44403c;">${escapeHtml(summary)}</p>
</td></tr></table>`
}

/** Whether this code already went to this address (in a confirmation or code email) in the last few minutes */
async function codeRecentlyEmailed(to: string, code: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailLogs)
    .where(
      and(
        sql`${to} = any(${emailLogs.to})`,
        eq(emailLogs.status, 'sent'),
        gte(emailLogs.createdAt, new Date(Date.now() - RESEND_AFTER_MS)),
        // Codes are only letters, digits and a hyphen, so nothing in them acts as a LIKE wildcard
        like(emailLogs.textBody, `%${code}%`),
      ),
    )
  return Number(n) > 0
}

/** Email the code on its own. Never throws. */
export async function sendWelcomeCodeEmail(email: string, firstName: string, offer: WelcomeOfferCode): Promise<'sent' | 'recent' | 'throttled' | 'failed'> {
  const to = email.trim().toLowerCase()
  try {
    if (await codeRecentlyEmailed(to, offer.code)) return 'recent'
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(emailLogs)
      .where(and(eq(emailLogs.templateKey, WELCOME_CODE_TEMPLATE_KEY), gte(emailLogs.createdAt, new Date(Date.now() - 60 * 60 * 1000))))
    if (Number(n) >= WELCOME_CODE_HOURLY_LIMIT) {
      console.warn(`[newsletter] welcome code emails paused: ${n} sent in the last hour (limit ${WELCOME_CODE_HOURLY_LIMIT})`)
      return 'throttled'
    }

    const now = new Date()
    const { until, within } = describeExpiry(new Date(offer.expiresAt), now)
    const { subject, html, text } = renderNewsletter(
      {
        subject: `Your ${offer.percent}% off code: ${offer.code}`,
        preheader: `Valid for ${within} (until ${until}).`,
        bodyHtml: `<p>Hi {name},</p><p>Here’s your Twinkle Locs welcome code, as promised:</p>${welcomeCodeBlockHtml(offer, now)}<p>${escapeHtml(offerTerms(offer, now))} Enter it in the promo code box before you pay.</p>`,
        ctaLabel: 'Shop Twinkles',
        ctaUrl: shopTwinklesUrl(),
      },
      firstName,
      'You asked for this code on the Twinkle Locs website. If it wasn’t you, you can ignore this email.',
    )
    const res = await sendEmail({
      to,
      subject,
      html,
      text,
      category: 'newsletter',
      templateKey: WELCOME_CODE_TEMPLATE_KEY,
      idempotencyKey: `${WELCOME_CODE_TEMPLATE_KEY}:${to}:${offer.code}:${Math.floor(Date.now() / RESEND_AFTER_MS)}`,
    })
    return res.ok ? 'sent' : 'failed'
  } catch (err) {
    console.error('[newsletter] welcome code email failed:', err)
    return 'failed'
  }
}
