import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { sanitizeArticleHtml } from '@/lib/content'
import { renderNewsletter, absoluteUrl, type NewsletterContent } from './template'
import { sendNewsletterEmail } from './send'

/**
 * Sending a newsletter to every subscriber, in small resumable batches.
 *
 * No extra tables: each send is logged in email_logs with template_key
 * "newsletter:<campaignId>", which is how we know who already has it (a retry
 * or a resumed send never emails anyone twice; Resend's idempotency key backs
 * that up) and how the Sent history is built.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const campaignKey = (id: string) => `newsletter:${id}`
export const isCampaignId = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id)

/** Validate and clean what the admin wrote. Returns an error message instead when it can't be sent. */
export function parseNewsletterContent(raw: unknown): { content: NewsletterContent } | { error: string } {
  const r = (raw ?? {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const subject = str(r.subject, 150)
  // Sanitised like blog posts; images left without a (safe) src are dropped so email apps don't show broken boxes
  const bodyHtml = sanitizeArticleHtml(str(r.bodyHtml, 200_000)).replace(/<img(?![^>]*\ssrc="[^"]+")[^>]*>/gi, '')
  if (!subject) return { error: 'Add a subject line.' }
  if (!bodyHtml.replace(/<[^>]+>/g, '').trim()) return { error: 'Write the newsletter before sending it.' }
  const ctaLabel = str(r.ctaLabel, 60)
  const ctaUrl = str(r.ctaUrl, 500)
  if (ctaLabel && !absoluteUrl(ctaUrl)) return { error: 'The button needs a link, like /catalog or https://…' }
  const hero = str(r.heroImageUrl, 1000)
  return {
    content: {
      subject,
      preheader: str(r.preheader, 200),
      heroImageUrl: /^https:\/\//i.test(hero) ? hero : null,
      bodyHtml,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaLabel ? ctaUrl : undefined,
    },
  }
}

type Row = Record<string, unknown>
function rowsOf(res: unknown): Row[] {
  return (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as Row[]
}

export type CampaignProgress = { total: number; sent: number; failed: number; remaining: number }

export async function campaignProgress(campaignId: string): Promise<CampaignProgress> {
  const key = campaignKey(campaignId)
  const [r] = rowsOf(
    await db.execute(sql`
      WITH per AS (
        SELECT s.email,
          EXISTS (SELECT 1 FROM email_logs l WHERE l.template_key = ${key} AND s.email = ANY(l."to") AND l.status = 'sent') AS sent,
          EXISTS (SELECT 1 FROM email_logs l WHERE l.template_key = ${key} AND s.email = ANY(l."to") AND l.status <> 'sent') AS failed
        FROM newsletter_subscribers s
      )
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE sent)::int AS sent,
        count(*) FILTER (WHERE failed AND NOT sent)::int AS failed,
        count(*) FILTER (WHERE NOT sent AND NOT failed)::int AS remaining
      FROM per
    `),
  )
  return { total: Number(r?.total ?? 0), sent: Number(r?.sent ?? 0), failed: Number(r?.failed ?? 0), remaining: Number(r?.remaining ?? 0) }
}

/** Subscribers still to be sent this campaign (or, with retryFailed, the ones whose send failed). */
async function nextRecipients(campaignId: string, limit: number, retryFailed: boolean): Promise<{ email: string; firstName: string }[]> {
  const key = campaignKey(campaignId)
  const rows = rowsOf(
    await db.execute(
      retryFailed
        ? sql`
          SELECT s.email, s.first_name FROM newsletter_subscribers s
          WHERE NOT EXISTS (SELECT 1 FROM email_logs l WHERE l.template_key = ${key} AND s.email = ANY(l."to") AND l.status = 'sent')
            AND EXISTS (SELECT 1 FROM email_logs l WHERE l.template_key = ${key} AND s.email = ANY(l."to") AND l.status <> 'sent')
          ORDER BY s.subscribed_at LIMIT ${limit}`
        : sql`
          SELECT s.email, s.first_name FROM newsletter_subscribers s
          WHERE NOT EXISTS (SELECT 1 FROM email_logs l WHERE l.template_key = ${key} AND s.email = ANY(l."to"))
          ORDER BY s.subscribed_at LIMIT ${limit}`,
    ),
  )
  return rows.map((r) => ({ email: String(r.email), firstName: String(r.first_name ?? '') }))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Send the next batch. Spaced out to stay under Resend's rate limit (2 per
 * second by default) and small enough to finish well inside a serverless
 * function's time limit; the admin page calls this until remaining is 0.
 */
export async function sendCampaignBatch(
  campaignId: string,
  content: NewsletterContent,
  { batchSize = 15, retryFailed = false, spacingMs = 550 }: { batchSize?: number; retryFailed?: boolean; spacingMs?: number } = {},
): Promise<CampaignProgress & { batchSent: number; batchFailed: number }> {
  const recipients = await nextRecipients(campaignId, batchSize, retryFailed)
  let batchSent = 0
  let batchFailed = 0
  for (const [i, r] of recipients.entries()) {
    if (i > 0 && spacingMs) await sleep(spacingMs)
    const { subject, html, text } = renderNewsletter(content, r.firstName)
    const res = await sendNewsletterEmail({
      to: r.email,
      subject,
      html,
      text,
      templateKey: campaignKey(campaignId),
      logSubject: content.subject,
      idempotencyKey: `${campaignKey(campaignId)}:${r.email}${retryFailed ? ':retry' : ''}`,
    })
    if (res.ok) batchSent++
    else batchFailed++
  }
  return { ...(await campaignProgress(campaignId)), batchSent, batchFailed }
}

export type CampaignSummary = {
  id: string
  subject: string
  startedAt: string
  sent: number
  failed: number
  delivered: number
  opened: number
  problems: number
}

/** Past newsletters (newest first), built from the email log. */
export async function campaignHistory(limit = 50): Promise<CampaignSummary[]> {
  const rows = rowsOf(
    await db.execute(sql`
      WITH per AS (
        SELECT template_key AS k, "to"[1] AS e, max(subject) AS subject, min(created_at) AS t,
          bool_or(status = 'sent') AS ok,
          bool_or(delivery_status IN ('delivered', 'opened', 'clicked')) AS delivered,
          bool_or(delivery_status IN ('opened', 'clicked')) AS opened,
          bool_or(delivery_status IN ('bounced', 'complained', 'failed', 'suppressed')) AS problem
        FROM email_logs WHERE template_key LIKE 'newsletter:%'
        GROUP BY 1, 2
      )
      SELECT k, max(subject) AS subject, min(t) AS started,
        count(*) FILTER (WHERE ok)::int AS sent,
        count(*) FILTER (WHERE NOT ok)::int AS failed,
        count(*) FILTER (WHERE delivered)::int AS delivered,
        count(*) FILTER (WHERE opened)::int AS opened,
        count(*) FILTER (WHERE problem)::int AS problems
      FROM per GROUP BY k ORDER BY min(t) DESC LIMIT ${limit}
    `),
  )
  return rows.map((r) => ({
    id: String(r.k).slice('newsletter:'.length),
    subject: String(r.subject ?? ''),
    startedAt: new Date(String(r.started)).toISOString(),
    sent: Number(r.sent ?? 0),
    failed: Number(r.failed ?? 0),
    delivered: Number(r.delivered ?? 0),
    opened: Number(r.opened ?? 0),
    problems: Number(r.problems ?? 0),
  }))
}
