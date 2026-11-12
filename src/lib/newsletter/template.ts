import { escapeHtml } from '@/lib/email/orderTemplate'

/**
 * The newsletter email, in the same brand frame as the order emails. Pure (no
 * server imports) so the admin's live preview renders exactly what gets sent.
 * The body HTML must already be sanitised on the server before sending.
 */

/** Replaced by sendNewsletterEmail() with each subscriber's own unsubscribe link */
export const UNSUBSCRIBE_PLACEHOLDER = '%%UNSUBSCRIBE_URL%%'

export type NewsletterContent = {
  subject: string
  /** Shown after the subject in inbox lists */
  preheader?: string
  heroImageUrl?: string | null
  /** Rich-text body from the admin editor; {name} becomes the subscriber's first name */
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
}

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

/** Absolute https link for the button (site paths like /catalog become full URLs). */
export function absoluteUrl(url: string | undefined): string | null {
  const u = (url ?? '').trim()
  if (!u) return null
  if (u.startsWith('/')) return SITE() + u
  if (/^https?:\/\//i.test(u)) return u
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return `https://${u}`
  return null
}

/** Inline styles for the tags the editor produces (many email apps ignore <style>). */
function styleBody(html: string): string {
  const s: Record<string, string> = {
    p: 'margin:0 0 16px 0;font-size:15px;color:#44403c;line-height:1.7;',
    h2: 'margin:24px 0 10px 0;font-size:20px;color:#1A3C34;font-weight:700;line-height:1.3;',
    h3: 'margin:20px 0 8px 0;font-size:13px;color:#1A3C34;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;',
    ul: 'margin:0 0 16px 0;padding-left:22px;color:#44403c;font-size:15px;line-height:1.7;',
    ol: 'margin:0 0 16px 0;padding-left:22px;color:#44403c;font-size:15px;line-height:1.7;',
    li: 'margin:0 0 6px 0;',
    a: 'color:#1A3C34;text-decoration:underline;',
    blockquote: 'margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #927750;background:#FAF8F4;color:#44403c;font-style:italic;',
    img: 'max-width:100%;height:auto;border-radius:8px;display:block;margin:0 0 16px 0;',
    hr: 'border:none;border-top:1px solid #e7e2d8;margin:24px 0;',
  }
  return html.replace(/<(p|h2|h3|ul|ol|li|a|blockquote|img|hr)(\s[^>]*)?>/gi, (m, tag: string, attrs = '') => {
    const style = s[tag.toLowerCase()]
    if (!style || /\sstyle=/i.test(attrs)) return m
    const selfClosing = /\/\s*$/.test(attrs)
    const rest = attrs.replace(/\/\s*$/, '')
    return `<${tag}${rest} style="${style}"${selfClosing ? ' /' : ''}>`
  })
}

function fillName(text: string, firstName: string | null | undefined): string {
  return text.replace(/\{name\}/g, firstName?.trim() || 'there')
}

/** HTML → readable plain text for the text part (links kept as "text (url)"). */
export function newsletterHtmlToText(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, '').trim()
      return text && text !== href ? `${text} (${href})` : href
    })
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|h[1-6]|blockquote|ul|ol)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n----\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function renderNewsletter(content: NewsletterContent, firstName?: string | null): { subject: string; html: string; text: string } {
  const subject = fillName(content.subject, firstName).replace(/\s+/g, ' ').trim()
  const body = styleBody(fillName(content.bodyHtml, firstName))
  const preheader = fillName(content.preheader ?? '', firstName).trim()
  const cta = content.ctaLabel?.trim() ? { label: content.ctaLabel.trim(), url: absoluteUrl(content.ctaUrl) } : null
  const hero = content.heroImageUrl && /^https:\/\//i.test(content.heroImageUrl) ? content.heroImageUrl : null
  const year = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#E8E0D0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;">
        <tr><td style="background-color:#1A3C34;border-radius:12px 12px 0 0;padding:24px 32px;">
          <a href="${SITE()}" style="text-decoration:none;"><div style="font-size:20px;font-weight:700;color:#C9A96E;letter-spacing:0.12em;text-transform:uppercase;">Twinkle Locs</div></a>
          <div style="font-size:11px;color:#E8E0D0;opacity:0.8;margin-top:3px;letter-spacing:0.04em;">Loc bead accessories, handmade in Nigeria</div>
        </td></tr>
        ${hero ? `<tr><td style="background-color:#ffffff;padding:0;"><img src="${escapeHtml(hero)}" alt="" width="560" style="width:100%;max-width:560px;height:auto;display:block;" /></td></tr>` : ''}
        <tr><td style="background-color:#ffffff;padding:32px;">
          ${body}
          ${
            cta && cta.url
              ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 8px 0;"><tr><td style="border-radius:8px;background-color:#1A3C34;">
                  <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#E8E0D0;text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
                </td></tr></table>`
              : ''
          }
        </td></tr>
        <tr><td style="background-color:#F5F0E8;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#78716c;line-height:1.6;">
            You're getting this because you joined the Twinkle Locs newsletter.
            <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#1A3C34;text-decoration:underline;">Unsubscribe</a>
          </p>
          <p style="margin:0;font-size:11px;color:#a8a29e;">&copy; ${year} Twinkle Locs &middot; Lagos, Nigeria</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const textBody = newsletterHtmlToText(fillName(content.bodyHtml, firstName))
  const text = [
    preheader,
    textBody,
    cta && cta.url ? `${cta.label}: ${cta.url}` : '',
    `--\nYou're getting this because you joined the Twinkle Locs newsletter.\nUnsubscribe: ${UNSUBSCRIBE_PLACEHOLDER}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return { subject, html, text }
}
