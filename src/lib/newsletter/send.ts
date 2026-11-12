import { sendEmail, type SendEmailResult } from '@/lib/email/client'
import { escapeHtml } from '@/lib/email/orderTemplate'
import { unsubscribeHeaders, unsubscribeUrl } from './unsubscribe'
import { UNSUBSCRIBE_PLACEHOLDER } from './template'

/**
 * The only way to send a newsletter email. Every send gets the subscriber's own
 * unsubscribe link and the one-click unsubscribe headers (Gmail/Yahoo require
 * them; the privacy policy and sign-up form promise them):
 * - if the email has UNSUBSCRIBE_PLACEHOLDER (renderNewsletter() puts one in its
 *   footer), it's replaced with the link
 * - otherwise a footer with the link is appended, so nothing can go out without one
 */
export async function sendNewsletterEmail(input: {
  to: string
  subject: string
  html: string
  text: string
  templateKey?: string
  /** Same key = Resend sends once (e.g. "newsletter:<campaign>:<email>") */
  idempotencyKey?: string
  /** Subject as written (with {name}) for the email log and Sent history */
  logSubject?: string
}): Promise<SendEmailResult> {
  const url = unsubscribeUrl(input.to)

  const html = input.html.includes(UNSUBSCRIBE_PLACEHOLDER)
    ? input.html.split(UNSUBSCRIBE_PLACEHOLDER).join(escapeHtml(url))
    : `${input.html}
<hr style="border:none;border-top:1px solid #e7e5e4;margin:32px 0 16px;" />
<p style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;color:#78716c;line-height:1.5;">
  You're getting this because you joined the Twinkle Locs newsletter with ${escapeHtml(input.to)}.<br />
  <a href="${escapeHtml(url)}" style="color:#1A3C34;">Unsubscribe</a>
</p>`

  const text = input.text.includes(UNSUBSCRIBE_PLACEHOLDER)
    ? input.text.split(UNSUBSCRIBE_PLACEHOLDER).join(url)
    : `${input.text}\n\n--\nYou're getting this because you joined the Twinkle Locs newsletter with ${input.to}.\nUnsubscribe: ${url}\n`

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text,
    category: 'newsletter',
    templateKey: input.templateKey ?? 'newsletter',
    headers: unsubscribeHeaders(input.to),
    idempotencyKey: input.idempotencyKey,
    logSubject: input.logSubject,
  })
}
