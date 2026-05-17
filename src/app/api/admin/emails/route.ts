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

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const logs = await db
    .select({
      id: emailLogs.id,
      to: emailLogs.to,
      subject: emailLogs.subject,
      templateKey: emailLogs.templateKey,
      orderId: emailLogs.orderId,
      resendMessageId: emailLogs.resendMessageId,
      status: emailLogs.status,
      error: emailLogs.error,
      sentAt: emailLogs.sentAt,
      createdAt: emailLogs.createdAt,
    })
    .from(emailLogs)
    .orderBy(desc(emailLogs.createdAt))
    .limit(200)

  return NextResponse.json({ logs })
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
