import { NextResponse } from 'next/server'
import { gte, sql } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db, emailLogs } from '@/db'
import { emailConfig, fromDomain, resendClient } from '@/lib/email/client'
import { getAdminNotificationEmail } from '@/lib/notifications/notificationState'

export type EmailHealth = {
  apiKey: boolean
  from: string | null
  replyTo: string
  adminRecipient: string
  webhookSecret: boolean
  domain: { name: string | null; status: string; detail?: string }
  last7Days: { sent: number; failed: number; problems: number; delivered: number }
}

/** Is email actually wired up? Checks config, asks Resend about the sending domain, and sums the last week. */
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = emailConfig()
  const domainName = fromDomain(cfg.from)
  let domain: EmailHealth['domain'] = { name: domainName, status: 'unknown' }

  const resend = resendClient()
  if (!resend) domain = { name: domainName, status: 'no_api_key' }
  else if (!domainName) domain = { name: null, status: 'no_from' }
  else {
    try {
      const res = await resend.domains.list()
      if (res.error) {
        // Send-only ("sending access") keys can't list domains
        domain = { name: domainName, status: 'unknown', detail: res.error.message }
      } else {
        const found = res.data?.data?.find((d) => d.name.toLowerCase() === domainName || domainName.endsWith('.' + d.name.toLowerCase()))
        domain = found ? { name: found.name, status: found.status } : { name: domainName, status: 'not_added' }
      }
    } catch (e) {
      domain = { name: domainName, status: 'unknown', detail: e instanceof Error ? e.message : String(e) }
    }
  }

  let last7Days = { sent: 0, failed: 0, problems: 0, delivered: 0 }
  try {
    const [row] = await db
      .select({
        sent: sql<number>`count(*) filter (where ${emailLogs.status} = 'sent')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${emailLogs.status} = 'failed')`.mapWith(Number),
        problems: sql<number>`count(*) filter (where ${emailLogs.deliveryStatus} in ('bounced','complained','failed','suppressed'))`.mapWith(Number),
        delivered: sql<number>`count(*) filter (where ${emailLogs.deliveryStatus} in ('delivered','opened','clicked'))`.mapWith(Number),
      })
      .from(emailLogs)
      .where(gte(emailLogs.createdAt, new Date(Date.now() - 7 * 86_400_000)))
    if (row) last7Days = row
  } catch {
    /* table/columns missing until drizzle-kit push */
  }

  const health: EmailHealth = {
    apiKey: !!cfg.apiKey,
    from: cfg.from,
    replyTo: cfg.replyTo,
    adminRecipient: await getAdminNotificationEmail().catch(() => cfg.replyTo),
    webhookSecret: !!cfg.webhookSecret,
    domain,
    last7Days,
  }
  return NextResponse.json(health)
}
