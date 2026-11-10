import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, emailLogs } from '@/db'
import { emailConfig, resendClient } from '@/lib/email/client'

/**
 * Resend → us: delivery events for emails we sent, matched to email_logs by
 * Resend's message id. Signed (Svix); set RESEND_WEBHOOK_SECRET from
 * Resend → Webhooks. Point it at https://<site>/api/webhooks/resend.
 */

// Later events must not hide earlier problems: a bounce stays a bounce.
const RANK: Record<string, number> = { delayed: 1, delivered: 2, opened: 3, clicked: 4, failed: 9, suppressed: 9, bounced: 10, complained: 10 }
const EVENT_TO_STATUS: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
}

type Payload = {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    bounce?: { message?: string; type?: string; subType?: string }
    failed?: { reason?: string }
    suppressed?: { message?: string; type?: string }
    click?: { link?: string }
  }
}

export async function POST(req: NextRequest) {
  const { webhookSecret } = emailConfig()
  const resend = resendClient()
  if (!webhookSecret || !resend) {
    return NextResponse.json({ error: 'Resend webhook not configured' }, { status: 503 })
  }

  const payload = await req.text()
  let event: Payload
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    }) as unknown as Payload
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const status = EVENT_TO_STATUS[event.type]
  const messageId = event.data?.email_id
  if (!status || !messageId) return NextResponse.json({ ignored: true })

  const detail =
    event.data?.bounce?.message ??
    event.data?.failed?.reason ??
    event.data?.suppressed?.message ??
    (status === 'complained' ? 'Recipient marked this email as spam' : null) ??
    event.data?.click?.link ??
    null

  const [log] = await db
    .select({ id: emailLogs.id, deliveryStatus: emailLogs.deliveryStatus })
    .from(emailLogs)
    .where(eq(emailLogs.resendMessageId, messageId))
    .limit(1)
  if (!log) return NextResponse.json({ ignored: true, reason: 'unknown email' })

  const current = log.deliveryStatus ? (RANK[log.deliveryStatus] ?? 0) : 0
  if (RANK[status] < current) return NextResponse.json({ ok: true, kept: log.deliveryStatus })

  await db
    .update(emailLogs)
    .set({
      deliveryStatus: status,
      deliveryDetail: detail ? String(detail).slice(0, 500) : null,
      deliveryUpdatedAt: event.created_at ? new Date(event.created_at) : new Date(),
    })
    .where(eq(emailLogs.id, log.id))

  return NextResponse.json({ ok: true, status })
}
