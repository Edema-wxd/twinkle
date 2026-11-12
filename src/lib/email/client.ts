import { Resend } from 'resend'
import { db, emailLogs } from '@/db'
import { BUSINESS } from '@/lib/config/business'

/**
 * The one way the app sends email. Every send goes through here so that:
 *  - configuration is checked in one place (RESEND_API_KEY, RESEND_FROM)
 *  - replies go to a monitored inbox (EMAIL_REPLY_TO, else the support address)
 *  - each send is logged in email_logs (awaited, so serverless can't drop it)
 *    with Resend's message id, which the Resend webhook uses to record
 *    delivered / bounced / complained
 *  - retries are safe: an idempotency key makes Resend ignore duplicates for 24h
 *  - brief Resend hiccups (429 / 5xx) are retried automatically
 */

export type EmailCategory = 'order' | 'admin' | 'custom' | 'test' | 'newsletter'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text: string
  category: EmailCategory
  /** e.g. 'confirmed', 'shipped', 'admin_new_order'. Stored in email_logs.template_key */
  templateKey?: string | null
  orderId?: string | null
  replyTo?: string | string[]
  /** Same key within 24h = Resend sends once. Use for anything a retry could repeat. */
  idempotencyKey?: string
  /** Extra email headers, e.g. List-Unsubscribe for newsletters */
  headers?: Record<string, string>
}

export type SendEmailResult = { ok: true; id: string | null; logId: string | null } | { ok: false; error: string; logId: string | null }

export type EmailConfig = {
  apiKey: string | null
  from: string | null
  replyTo: string
  webhookSecret: string | null
}

export function emailConfig(): EmailConfig {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || null,
    from: process.env.RESEND_FROM?.trim() || null,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || BUSINESS.support.email,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET?.trim() || null,
  }
}

let client: Resend | null = null
export function resendClient(): Resend | null {
  const { apiKey } = emailConfig()
  if (!apiKey) return null
  client ??= new Resend(apiKey)
  return client
}

const RETRYABLE = new Set(['rate_limit_exceeded', 'internal_server_error', 'application_error', 'daily_quota_exceeded_retry'])

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = emailConfig()
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((e) => e.trim()).filter(Boolean)
  const resend = resendClient()

  let id: string | null = null
  let error: string | null = null

  if (!resend || !cfg.from) {
    error = !resend ? 'Email is not set up: RESEND_API_KEY is missing.' : 'Email is not set up: RESEND_FROM is missing.'
  } else if (recipients.length === 0) {
    error = 'No recipient address.'
  } else {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await resend.emails.send(
          {
            from: cfg.from,
            to: recipients,
            subject: input.subject,
            html: input.html,
            text: input.text,
            replyTo: input.replyTo ?? cfg.replyTo,
            ...(input.headers ? { headers: input.headers } : {}),
            tags: [
              { name: 'category', value: input.category },
              ...(input.templateKey ? [{ name: 'template', value: input.templateKey.replace(/[^a-zA-Z0-9_-]/g, '_') }] : []),
            ],
          },
          input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
        )
        if (res.error) {
          const name = (res.error as { name?: string }).name ?? ''
          error = res.error.message ?? 'Resend error'
          if (RETRYABLE.has(name) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
            continue
          }
        } else {
          id = res.data?.id ?? null
          error = null
        }
        break
      } catch (e) {
        error = e instanceof Error ? e.message : 'Network error talking to Resend'
        if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
    }
  }

  let logId: string | null = null
  try {
    const [row] = await db
      .insert(emailLogs)
      .values({
        to: recipients,
        subject: input.subject,
        templateKey: input.templateKey ?? null,
        orderId: input.orderId ?? null,
        resendMessageId: id,
        status: error ? 'failed' : 'sent',
        error,
        htmlBody: input.html,
        textBody: input.text,
        sentAt: error ? null : new Date(),
      })
      .returning({ id: emailLogs.id })
    logId = row?.id ?? null
  } catch (e) {
    console.error('[email] Failed to write email log:', e)
  }

  if (error) {
    console.error('[email] Send failed', { subject: input.subject, category: input.category, error })
    return { ok: false, error, logId }
  }
  return { ok: true, id, logId }
}

/** The domain part of RESEND_FROM ("Twinkle Locs <orders@twinklelocs.com>" → twinklelocs.com). */
export function fromDomain(from: string | null): string | null {
  const m = from?.match(/@([^>\s]+)>?\s*$/)
  return m ? m[1].toLowerCase() : null
}
