import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs } from '@/db'
import { desc } from 'drizzle-orm'
import { Resend } from 'resend'

async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export type MergedEmail = {
  // Core identity
  resendId: string | null
  logId: string | null
  // Recipients / content
  to: string[]
  from: string | null
  subject: string
  // Status — prefer Resend's richer last_event; fall back to our 'sent'/'failed'
  lastEvent: string
  // Our metadata
  templateKey: string | null
  orderId: string | null
  canResend: boolean  // true when we have stored html/text or can rebuild from orderId
  // Timestamps
  createdAt: string
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const resend = new Resend(apiKey)

  // Fetch both sources in parallel
  const [resendResult, dbLogs] = await Promise.all([
    resend.emails.list({ limit: 100 }).catch((e) => {
      console.error('[admin/emails] Resend list failed:', e)
      return null
    }),
    db
      .select({
        id: emailLogs.id,
        to: emailLogs.to,
        subject: emailLogs.subject,
        templateKey: emailLogs.templateKey,
        orderId: emailLogs.orderId,
        resendMessageId: emailLogs.resendMessageId,
        status: emailLogs.status,
        error: emailLogs.error,
        htmlBody: emailLogs.htmlBody,
        sentAt: emailLogs.sentAt,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt))
      .limit(200)
      .catch(() => []),
  ])

  // Build lookup: resendMessageId → log entry
  const logByResendId = new Map(
    dbLogs
      .filter((l) => l.resendMessageId)
      .map((l) => [l.resendMessageId!, l])
  )
  // Track which log IDs we've already merged with a Resend record
  const mergedLogIds = new Set<string>()

  const merged: MergedEmail[] = []

  // ── Resend emails (source of truth for delivery status) ───────────────────
  const resendEmails = resendResult?.data?.data ?? []

  for (const re of resendEmails) {
    const log = logByResendId.get(re.id) ?? null
    if (log) mergedLogIds.add(log.id)

    const canResend = log
      ? !!(log.htmlBody || (log.orderId && log.templateKey))
      : false

    merged.push({
      resendId: re.id,
      logId: log?.id ?? null,
      to: re.to,
      from: re.from,
      subject: re.subject,
      lastEvent: re.last_event ?? 'sent',
      templateKey: log?.templateKey ?? null,
      orderId: log?.orderId ?? null,
      canResend,
      createdAt: re.created_at,
    })
  }

  // ── Local logs not matched to a Resend record (e.g. failed sends) ─────────
  for (const log of dbLogs) {
    if (mergedLogIds.has(log.id)) continue

    const canResend = !!(log.htmlBody || (log.orderId && log.templateKey))

    merged.push({
      resendId: log.resendMessageId ?? null,
      logId: log.id,
      to: log.to,
      from: null,
      subject: log.subject,
      lastEvent: log.status === 'failed' ? 'failed' : 'sent',
      templateKey: log.templateKey ?? null,
      orderId: log.orderId ?? null,
      canResend,
      createdAt:
        log.createdAt instanceof Date
          ? log.createdAt.toISOString()
          : String(log.createdAt),
    })
  }

  // Sort newest first (Resend dates are ISO strings; local dates may be Date objects)
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json({ emails: merged, hasMore: resendResult?.data?.has_more ?? false })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { to, subject, htmlBody, textBody } = body as Record<string, unknown>

  if (!to || !subject || typeof subject !== 'string' || subject.trim() === '') {
    return NextResponse.json({ error: 'to and subject are required' }, { status: 400 })
  }

  const recipients: string[] = Array.isArray(to)
    ? (to as string[]).map((e) => e.trim()).filter(Boolean)
    : typeof to === 'string'
    ? to.split(',').map((e) => e.trim()).filter(Boolean)
    : []

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No valid recipients' }, { status: 400 })
  }

  const html = typeof htmlBody === 'string' ? htmlBody : undefined
  const text = typeof textBody === 'string' ? textBody : undefined

  if (!html && !text) {
    return NextResponse.json({ error: 'htmlBody or textBody is required' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  let resendMessageId: string | null = null
  let logStatus: 'sent' | 'failed' = 'sent'
  let logError: string | null = null

  try {
    const result = await resend.emails.send({
      from,
      to: recipients,
      subject: subject.trim(),
      html: html ?? '',
      text: text ?? '',
    })
    if (result.error) throw new Error(result.error.message ?? 'Resend error')
    resendMessageId = result.data?.id ?? null
  } catch (err) {
    logStatus = 'failed'
    logError = err instanceof Error ? err.message : 'Unknown error'
  }

  const [inserted] = await db.insert(emailLogs).values({
    to: recipients,
    subject: subject.trim(),
    templateKey: null,
    orderId: null,
    resendMessageId,
    status: logStatus,
    error: logError,
    htmlBody: html ?? null,
    textBody: text ?? null,
    sentAt: logStatus === 'sent' ? new Date() : null,
  }).returning({ id: emailLogs.id })

  if (logStatus === 'failed') {
    return NextResponse.json({ error: logError, logId: inserted?.id }, { status: 502 })
  }

  return NextResponse.json({ sent: true, logId: inserted?.id, resendMessageId }, { status: 201 })
}
