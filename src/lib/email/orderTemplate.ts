import { BUSINESS } from '@/lib/config/business'

/**
 * Renders customer order emails. Used by real sends AND the admin template
 * preview, so what Unoma previews is exactly what customers receive.
 */

export type CustomerEmailEvent = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'review_reminder'

export interface OrderEmailItem {
  productName: string
  variantName: string
  quantity: number
  unitPrice: number // naira
  lineTotal: number // naira
  tierQty: number
  threadColour?: string | null
}

export type OrderTemplate = {
  /** May contain {name} {ref} {total} {tracking} */
  subject: string
  bannerColor: string
  bannerLabel: string
  /** Plain text written in the admin. Blank lines = new paragraph. Same placeholders as subject. */
  body: string
}

export const DEFAULT_ORDER_TEMPLATES: Record<CustomerEmailEvent, OrderTemplate & { name: string }> = {
  confirmed: {
    name: 'Order Confirmed',
    subject: 'Order confirmed: #{ref} | Twinkle Locs',
    bannerColor: '#1A3C34',
    bannerLabel: '✓ Order confirmed',
    body: "We've received your order and payment, thank you! We'll start preparing your loc beads shortly and keep you updated as things move along.",
  },
  processing: {
    name: 'Order Processing',
    subject: 'Your order is being prepared: #{ref} | Twinkle Locs',
    bannerColor: '#6F5A39',
    bannerLabel: 'Being prepared',
    body: "Good news, your order is now being prepared! We're getting your loc beads ready and will let you know as soon as they're dispatched.",
  },
  shipped: {
    name: 'Order Shipped',
    subject: 'Your order is on its way: #{ref} | Twinkle Locs',
    bannerColor: '#927750',
    bannerLabel: 'On its way',
    body: 'Your Twinkle Locs order is on its way! If you have any questions about your delivery, just reply to this email or message us on WhatsApp.',
  },
  delivered: {
    name: 'Order Delivered',
    subject: 'Your order has been delivered: #{ref} | Twinkle Locs',
    bannerColor: '#1A3C34',
    bannerLabel: '✓ Delivered',
    body: "Your order has arrived! We hope you love your new loc beads. If you have a moment, a review would mean the world to our small business. Thank you for choosing Twinkle Locs.",
  },
  review_reminder: {
    name: 'Review Reminder',
    subject: 'How are you enjoying your beads, {name}? #{ref}',
    bannerColor: '#927750',
    bannerLabel: "We'd love your feedback",
    body: "We hope you're enjoying your loc beads! Reviews from customers like you help other loc lovers discover us and keep our small business growing. It only takes a minute.",
  },
}

export type RenderInput = {
  template: OrderTemplate
  event: CustomerEmailEvent
  customerName: string
  orderReference: string
  totalNaira: number
  trackingNumber?: string | null
  items?: OrderEmailItem[]
}

export function shortRef(reference: string) {
  return reference.slice(-10).toUpperCase()
}

function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{(name|ref|total|tracking)\}/g, (_, k: string) => vars[k] ?? '')
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Admin-written plain text → safe HTML paragraphs (blank line = new paragraph, newline = line break). */
function paragraphs(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;color:#44403c;line-height:1.7;">${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`,
    )
    .join('')
}

function safeColor(c: string) {
  return /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : '#1A3C34'
}

export function renderOrderEmail(input: RenderInput): { subject: string; html: string; text: string } {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')
  const ref = shortRef(input.orderReference)
  const total = '₦' + input.totalNaira.toLocaleString('en-NG')
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there'
  const vars = { name: firstName, ref, total, tracking: input.trackingNumber ?? '' }
  const items = input.items ?? []
  const wantsReview = input.event === 'delivered' || input.event === 'review_reminder'
  const reviewUrl = `${siteUrl}/review?ref=${encodeURIComponent(input.orderReference)}`
  const orderUrl = `${siteUrl}/orders/${encodeURIComponent(input.orderReference)}`

  const subject = fill(input.template.subject, vars).replace(/\s+/g, ' ').trim()
  const bannerLabel = fill(input.template.bannerLabel, vars)
  const body = fill(input.template.body, vars)
  const year = new Date().getFullYear()

  const itemLabel = (item: OrderEmailItem) =>
    [item.variantName, item.tierQty > 1 ? `Pack of ${item.tierQty}` : null, item.threadColour || null].filter(Boolean).join(' · ')

  const itemsRows = items.length
    ? `<tr><td style="padding-top:20px;">
        <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Your items</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${items
            .map(
              (item) => `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #efece6;vertical-align:top;">
              <div style="font-size:13px;color:#1c1917;font-weight:600;">${escapeHtml(item.productName)}</div>
              <div style="font-size:12px;color:#78716c;margin-top:1px;">${escapeHtml(itemLabel(item))} &times; ${item.quantity}</div>
            </td>
            <td style="padding:8px 0 8px 8px;border-bottom:1px solid #efece6;text-align:right;white-space:nowrap;vertical-align:top;font-size:13px;color:#1c1917;">&#8358;${item.lineTotal.toLocaleString('en-NG')}</td>
          </tr>`,
            )
            .join('')}
        </table>
      </td></tr>`
    : ''

  const trackingRow = input.trackingNumber
    ? `<tr><td style="padding-top:12px;border-top:1px solid #e7e2d8;">
        <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Tracking number</div>
        <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:14px;color:#1c1917;font-weight:600;">${escapeHtml(input.trackingNumber)}</div>
      </td></tr>`
    : ''

  const reviewSection = wantsReview
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5F0E8;border-radius:8px;margin-top:8px;">
        <tr><td style="padding:22px 24px;text-align:center;">
          <div style="font-size:15px;color:#1A3C34;font-weight:700;margin-bottom:6px;">Loved your order?</div>
          <div style="font-size:13px;color:#57534e;margin-bottom:16px;">A quick review helps other loc lovers discover us.</div>
          <a href="${reviewUrl}" style="display:inline-block;background-color:#1A3C34;color:#E8E0D0;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Leave a review</a>
        </td></tr>
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#E8E0D0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(body.slice(0, 140))}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;">
        <tr><td style="background-color:#1A3C34;border-radius:12px 12px 0 0;padding:24px 32px;">
          <div style="font-size:20px;font-weight:700;color:#C9A96E;letter-spacing:0.12em;text-transform:uppercase;">Twinkle Locs</div>
          <div style="font-size:11px;color:#E8E0D0;opacity:0.8;margin-top:3px;letter-spacing:0.04em;">Loc bead accessories, handmade in Nigeria</div>
        </td></tr>
        <tr><td style="background-color:${safeColor(input.template.bannerColor)};padding:12px 32px;">
          <span style="font-size:13px;font-weight:600;color:#ffffff;letter-spacing:0.02em;">${escapeHtml(bannerLabel)}</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:32px;">
          <p style="margin:0 0 16px 0;font-size:16px;color:#1c1917;font-weight:600;">Hi ${escapeHtml(firstName)},</p>
          ${paragraphs(body)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF8F4;border:1px solid #e7e2d8;border-radius:8px;margin:12px 0 24px 0;">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="padding-bottom:12px;">
                  <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order reference</div>
                  <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:15px;color:#1c1917;font-weight:600;">#${escapeHtml(ref)}</div>
                </td></tr>
                <tr><td style="padding-top:12px;border-top:1px solid #e7e2d8;">
                  <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order total</div>
                  <div style="font-size:17px;color:#1c1917;font-weight:700;">${escapeHtml(total)}</div>
                </td></tr>
                ${itemsRows}
                ${trackingRow}
              </table>
            </td></tr>
          </table>
          ${reviewSection}
          <p style="margin:24px 0 0 0;font-size:13px;color:#57534e;line-height:1.7;">
            <a href="${orderUrl}" style="color:#1A3C34;font-weight:600;">View your order</a> &nbsp;·&nbsp;
            Questions? Just reply to this email or message us on
            <a href="${BUSINESS.whatsapp.url(`Hi, I have a question about order #${ref}`)}" style="color:#1A3C34;font-weight:600;">WhatsApp</a>.
          </p>
        </td></tr>
        <tr><td style="background-color:#F5F0E8;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#78716c;">&copy; ${year} Twinkle Locs &nbsp;·&nbsp; <a href="mailto:${BUSINESS.support.email}" style="color:#78716c;">${BUSINESS.support.email}</a> &nbsp;·&nbsp; <a href="${siteUrl}" style="color:#78716c;">twinklelocs.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    body,
    '',
    ...(items.length
      ? ['Your items:', ...items.map((i) => `  ${i.productName} · ${itemLabel(i)} × ${i.quantity}: ₦${i.lineTotal.toLocaleString('en-NG')}`), '']
      : []),
    `Order: #${ref}`,
    `Total: ${total}`,
    ...(input.trackingNumber ? [`Tracking: ${input.trackingNumber}`] : []),
    `View your order: ${orderUrl}`,
    ...(wantsReview ? ['', `Leave a review: ${reviewUrl}`] : []),
    '',
    `Questions? Reply to this email or WhatsApp us: ${BUSINESS.whatsapp.url()}`,
    '',
    'Twinkle Locs',
  ].join('\n')

  return { subject, html, text }
}
