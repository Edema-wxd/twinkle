import { and, eq, gte, sql } from 'drizzle-orm'
import { db, settings, emailLogs } from '@/db'
import { renderNewsletter } from './template'
import { DEFAULT_WELCOME, type WelcomeSettings } from './welcomeDefault'
import { parseNewsletterContent } from './campaign'
import { sendNewsletterEmail } from './send'

export { DEFAULT_WELCOME, type WelcomeSettings }

/**
 * The welcome email a new newsletter subscriber gets straight after joining.
 * Editable in Admin → Newsletter → Welcome email; stored as JSON in settings
 * (no extra table). Sent with the subscriber's own unsubscribe link like every
 * newsletter email.
 */

const SETTINGS_KEY = 'newsletter_welcome'
export const WELCOME_TEMPLATE_KEY = 'newsletter_welcome'
/** Backstop against the public sign-up form being used to email strangers in bulk */
export const WELCOME_HOURLY_LIMIT = 50

export async function getWelcomeSettings(): Promise<WelcomeSettings> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).limit(1)
    if (!row) return DEFAULT_WELCOME
    const raw = JSON.parse(row.value) as { enabled?: unknown; content?: unknown }
    const parsed = parseNewsletterContent(raw.content)
    if ('error' in parsed) return { ...DEFAULT_WELCOME, enabled: raw.enabled !== false }
    return { enabled: raw.enabled !== false, content: parsed.content }
  } catch (err) {
    console.error('[newsletter] failed to read welcome email settings, using the default:', err)
    return DEFAULT_WELCOME
  }
}

/** Validate and store the admin's edits. Returns an error message when the content can't be used. */
export async function saveWelcomeSettings(raw: unknown): Promise<{ settings: WelcomeSettings } | { error: string }> {
  const r = (raw ?? {}) as { enabled?: unknown; content?: unknown }
  const parsed = parseNewsletterContent(r.content)
  if ('error' in parsed) return { error: parsed.error }
  const value: WelcomeSettings = { enabled: r.enabled !== false, content: parsed.content }
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
  return { settings: value }
}

/**
 * Send the welcome email to a new subscriber. Never throws; returns what happened.
 * At most one per address (idempotency key), and paused if the sign-up form
 * produces an unusual burst.
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<'sent' | 'disabled' | 'throttled' | 'failed'> {
  try {
    const welcome = await getWelcomeSettings()
    if (!welcome.enabled) return 'disabled'

    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(emailLogs)
      .where(and(eq(emailLogs.templateKey, WELCOME_TEMPLATE_KEY), gte(emailLogs.createdAt, new Date(Date.now() - 60 * 60 * 1000))))
    if (Number(n) >= WELCOME_HOURLY_LIMIT) {
      console.warn(`[newsletter] welcome emails paused: ${n} sent in the last hour (limit ${WELCOME_HOURLY_LIMIT})`)
      return 'throttled'
    }

    const { subject, html, text } = renderNewsletter(welcome.content, firstName)
    const res = await sendNewsletterEmail({
      to: email,
      subject,
      html,
      text,
      templateKey: WELCOME_TEMPLATE_KEY,
      idempotencyKey: `${WELCOME_TEMPLATE_KEY}:${email.trim().toLowerCase()}`,
      logSubject: welcome.content.subject,
    })
    return res.ok ? 'sent' : 'failed'
  } catch (err) {
    console.error('[newsletter] welcome email failed:', err)
    return 'failed'
  }
}
