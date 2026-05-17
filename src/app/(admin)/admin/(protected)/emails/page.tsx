import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs, emailTemplates } from '@/db'
import { desc } from 'drizzle-orm'
import { Resend } from 'resend'
import { EmailsManager } from '../../../_components/EmailsManager'
import type { MergedEmail } from '@/app/api/admin/emails/route'

export default async function AdminEmailsPage() {
  await requireAdminSession()

  const apiKey = process.env.RESEND_API_KEY ?? ''
  const resend = new Resend(apiKey)

  const [resendResult, dbLogs, templates] = await Promise.all([
    apiKey
      ? resend.emails.list({ limit: 100 }).catch(() => null)
      : Promise.resolve(null),
    db
      .select({
        id: emailLogs.id,
        to: emailLogs.to,
        subject: emailLogs.subject,
        templateKey: emailLogs.templateKey,
        orderId: emailLogs.orderId,
        resendMessageId: emailLogs.resendMessageId,
        status: emailLogs.status,
        htmlBody: emailLogs.htmlBody,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt))
      .limit(200)
      .catch(() => []),
    db.select().from(emailTemplates).catch(() => []),
  ])

  // Build lookup: resendMessageId → log entry
  const logByResendId = new Map(
    dbLogs.filter((l) => l.resendMessageId).map((l) => [l.resendMessageId!, l])
  )
  const mergedLogIds = new Set<string>()
  const merged: MergedEmail[] = []

  for (const re of resendResult?.data?.data ?? []) {
    const log = logByResendId.get(re.id) ?? null
    if (log) mergedLogIds.add(log.id)
    merged.push({
      resendId: re.id,
      logId: log?.id ?? null,
      to: re.to,
      from: re.from,
      subject: re.subject,
      lastEvent: re.last_event ?? 'sent',
      templateKey: log?.templateKey ?? null,
      orderId: log?.orderId ?? null,
      canResend: log ? !!(log.htmlBody || (log.orderId && log.templateKey)) : false,
      createdAt: re.created_at,
    })
  }

  for (const log of dbLogs) {
    if (mergedLogIds.has(log.id)) continue
    merged.push({
      resendId: log.resendMessageId ?? null,
      logId: log.id,
      to: log.to,
      from: null,
      subject: log.subject,
      lastEvent: log.status === 'failed' ? 'failed' : 'sent',
      templateKey: log.templateKey ?? null,
      orderId: log.orderId ?? null,
      canResend: !!(log.htmlBody || (log.orderId && log.templateKey)),
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    })
  }

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const serialisedTemplates = templates.map((t) => ({
    ...t,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  }))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Emails</h1>
        <p className="text-stone-400 text-sm">All emails sent via Resend — compose new ones and manage templates.</p>
      </div>
      <EmailsManager
        initialEmails={merged}
        initialHasMore={resendResult?.data?.has_more ?? false}
        initialTemplates={serialisedTemplates}
      />
    </div>
  )
}
