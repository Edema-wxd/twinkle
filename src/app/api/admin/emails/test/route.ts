import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { sendEmail } from '@/lib/email/client'
import { getAdminNotificationEmail } from '@/lib/notifications/notificationState'
import { escapeHtml } from '@/lib/email/orderTemplate'

/** Sends a test email (default: the shop's notification address) to prove Resend works end to end. */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { to?: unknown }
  const to = typeof body.to === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to.trim()) ? body.to.trim() : await getAdminNotificationEmail()
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })

  const result = await sendEmail({
    to,
    subject: `Test email from Twinkle Locs (${when})`,
    text: `This is a test from your shop's admin, sent ${when} (Lagos time).\n\nIf you're reading this, order emails can reach this inbox. Check it didn't land in spam.\n\nSent by ${session.user.email}.`,
    html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;max-width:520px;">
      <h2 style="color:#1A3C34;margin:0 0 12px;">It works ✓</h2>
      <p>This is a test from your shop's admin, sent ${escapeHtml(when)} (Lagos time).</p>
      <p>If you're reading this, order emails can reach this inbox. Check it didn't land in spam.</p>
      <p style="color:#78716c;font-size:12px;">Sent by ${escapeHtml(session.user.email)}.</p>
    </div>`,
    category: 'test',
    templateKey: 'test',
  })

  if (!result.ok) return NextResponse.json({ error: result.error, to }, { status: 502 })
  return NextResponse.json({ sent: true, to, resendMessageId: result.id })
}
