import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { emailConfig } from '@/lib/email/client'
import { isCampaignId, parseNewsletterContent, sendCampaignBatch } from '@/lib/newsletter/campaign'

// Each call sends one small batch (~10s); the admin page calls again until done
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { campaignId?: unknown; content?: unknown; retryFailed?: unknown } | null
  if (!body || !isCampaignId(body.campaignId)) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })

  const parsed = parseNewsletterContent(body.content)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const cfg = emailConfig()
  if (!cfg.apiKey || !cfg.from) {
    return NextResponse.json({ error: 'Email isn’t set up yet (RESEND_API_KEY / RESEND_FROM). See Admin → Emails.' }, { status: 503 })
  }

  try {
    const progress = await sendCampaignBatch(body.campaignId, parsed.content, { retryFailed: body.retryFailed === true })
    return NextResponse.json(progress)
  } catch (err) {
    console.error('[newsletter] batch failed:', err)
    return NextResponse.json({ error: 'Sending stopped because of a server error. Press Resume to carry on; nobody gets it twice.' }, { status: 500 })
  }
}
