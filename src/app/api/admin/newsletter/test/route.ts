import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { parseNewsletterContent } from '@/lib/newsletter/campaign'
import { renderNewsletter } from '@/lib/newsletter/template'
import { sendNewsletterEmail } from '@/lib/newsletter/send'

/** Send the draft to the signed-in admin, to check it in a real inbox before sending to everyone. */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseNewsletterContent(await req.json().catch(() => null))
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const to = session.user.email
  const firstName = session.user.name?.trim().split(/\s+/)[0] ?? null
  const { subject, html, text } = renderNewsletter(parsed.content, firstName)
  const res = await sendNewsletterEmail({ to, subject: `[Test] ${subject}`, html, text, templateKey: 'newsletter-test' })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 })
  return NextResponse.json({ ok: true, to })
}
