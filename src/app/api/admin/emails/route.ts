import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs } from '@/db'
import { desc } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/client'

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
      deliveryStatus: emailLogs.deliveryStatus,
      deliveryDetail: emailLogs.deliveryDetail,
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

  const result = await sendEmail({
    to: recipients,
    subject: subject.trim(),
    html: html ?? `<pre style="font-family:inherit;white-space:pre-wrap">${(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
    text: text ?? (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    category: 'custom',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error, logId: result.logId }, { status: 502 })
  }
  return NextResponse.json({ sent: true, logId: result.logId, resendMessageId: result.id }, { status: 201 })
}
