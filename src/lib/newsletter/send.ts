import { sendEmail, type SendEmailResult } from '@/lib/email/client'
import { escapeHtml } from '@/lib/email/orderTemplate'
import { unsubscribeHeaders, unsubscribeUrl } from './unsubscribe'

/**
 * The only way to send a newsletter email. It always adds the unsubscribe
 * footer and the one-click unsubscribe headers, so no newsletter can go out
 * without them (the privacy policy and the sign-up form promise this).
 */
export async function sendNewsletterEmail(input: {
  to: string
  subject: string
  /** Body HTML (the footer is appended) */
  html: string
  /** Plain-text body (the footer is appended) */
  text: string
  templateKey?: string
}): Promise<SendEmailResult> {
  const url = unsubscribeUrl(input.to)
  const html = `${input.html}
<hr style="border:none;border-top:1px solid #e7e5e4;margin:32px 0 16px;" />
<p style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#78716c;line-height:1.5;">
  You're getting this because you joined the Twinkle Locs newsletter with ${escapeHtml(input.to)}.<br />
  <a href="${escapeHtml(url)}" style="color:#1A3C34;">Unsubscribe</a>
</p>`
  const text = `${input.text}\n\n--\nYou're getting this because you joined the Twinkle Locs newsletter with ${input.to}.\nUnsubscribe: ${url}\n`

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text,
    category: 'newsletter',
    templateKey: input.templateKey ?? 'newsletter',
    headers: unsubscribeHeaders(input.to),
  })
}
