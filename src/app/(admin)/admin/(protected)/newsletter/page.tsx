import { desc } from 'drizzle-orm'
import { requireAdminSession } from '@/lib/auth/server'
import { db, newsletterSubscribers } from '@/db'
import { campaignHistory, type CampaignSummary } from '@/lib/newsletter/campaign'
import { emailConfig } from '@/lib/email/client'
import { getWelcomeSettings } from '@/lib/newsletter/welcome'
import { NewsletterManager, type SubscriberRow } from '../../../_components/NewsletterManager'

export default async function AdminNewsletterPage() {
  // Layout checks too, but pages never trust the layout alone (CVE-2025-29927)
  const session = await requireAdminSession()

  const [subs, history, welcome] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt))
      .catch((e) => {
        console.error('[newsletter] failed to load subscribers:', e)
        return null
      }),
    campaignHistory().catch((e): CampaignSummary[] => {
      console.error('[newsletter] failed to load history:', e)
      return []
    }),
    getWelcomeSettings(),
  ])

  const subscribers: SubscriberRow[] = (subs ?? []).map((s) => ({
    id: s.id,
    firstName: s.firstName,
    email: s.email,
    sourcePage: s.sourcePage,
    subscribedAt: s.subscribedAt.toISOString(),
  }))
  const cfg = emailConfig()

  return (
    <NewsletterManager
      subscribers={subscribers}
      loadFailed={subs === null}
      history={history}
      adminEmail={session.user.email}
      emailReady={Boolean(cfg.apiKey && cfg.from)}
      welcome={welcome}
    />
  )
}
