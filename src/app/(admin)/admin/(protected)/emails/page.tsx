import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs, emailTemplates } from '@/db'
import { desc } from 'drizzle-orm'
import { EmailsManager } from '../../../_components/EmailsManager'

export default async function AdminEmailsPage() {
  await requireAdminSession()

  const [logs, templates] = await Promise.all([
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
        sentAt: emailLogs.sentAt,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt))
      .limit(200)
      .catch(() => []),
    db
      .select()
      .from(emailTemplates)
      .catch(() => []),
  ])

  const serialisedLogs = logs.map((l) => ({
    ...l,
    sentAt: l.sentAt instanceof Date ? l.sentAt.toISOString() : (l.sentAt ?? null),
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
  }))

  const serialisedTemplates = templates.map((t) => ({
    ...t,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  }))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Emails</h1>
        <p className="text-stone-400 text-sm">View sent emails, compose new ones, and manage email templates.</p>
      </div>
      <EmailsManager initialLogs={serialisedLogs} initialTemplates={serialisedTemplates} />
    </div>
  )
}
