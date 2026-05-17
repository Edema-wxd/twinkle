import { Resend } from 'resend'
import { db } from '@/db'
import { orderStatusEmails, emailTemplates, emailLogs } from '@/db'
import { eq } from 'drizzle-orm'
import { BUSINESS } from '@/lib/config/business'

export type CustomerEmailEvent = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'review_reminder'

export interface OrderEmailItem {
  productName: string
  variantName: string
  quantity: number
  unitPrice: number  // naira
  lineTotal: number  // naira
  tierQty: number
  threadColour?: string | null
}

interface CustomerEmailInput {
  to: string
  customerName: string
  orderReference: string
  totalNaira: number
  event: CustomerEmailEvent
  trackingNumber?: string | null
  items?: OrderEmailItem[]
  orderId?: string | null
}

type TemplateConfig = {
  subject: (ref: string) => string
  bannerColor: string
  bannerLabel: string
  body: string
}

const HARDCODED_TEMPLATES: Record<CustomerEmailEvent, TemplateConfig> = {
  confirmed: {
    subject: (ref) => `Order confirmed — #${ref} | Twinkle Locs`,
    bannerColor: '#b45309',
    bannerLabel: '✓ Order Confirmed',
    body: "We've received your order and payment — thank you! We'll start preparing your loc beads shortly and will keep you updated as things move along.",
  },
  processing: {
    subject: (ref) => `Your order is being prepared — #${ref} | Twinkle Locs`,
    bannerColor: '#1d4ed8',
    bannerLabel: '⚙ Order Processing',
    body: "Good news — your order is now being prepared! Our team is getting your loc beads ready. We'll let you know as soon as they've been dispatched.",
  },
  shipped: {
    subject: (ref) => `Your order has shipped! — #${ref} | Twinkle Locs`,
    bannerColor: '#6d28d9',
    bannerLabel: '✈ Order Shipped',
    body: "Your Twinkle Locs order is on its way! Expect delivery within the standard timeframe for your area. If you have any questions about your delivery, feel free to get in touch.",
  },
  delivered: {
    subject: (ref) => `Your order has been delivered — #${ref} | Twinkle Locs`,
    bannerColor: '#15803d',
    bannerLabel: '✓ Order Delivered',
    body: "Your order has arrived! We hope you love your new loc beads. If you have a moment, a review would mean the world to our small business — thank you for choosing Twinkle Locs.",
  },
  review_reminder: {
    subject: (ref) => `How was your Twinkle Locs experience? — #${ref}`,
    bannerColor: '#d4a843',
    bannerLabel: "⭐ We'd love your feedback",
    body: "We hope you're enjoying your loc beads! Reviews from customers like you help other loc lovers discover us and keep our small business growing. It only takes a minute — we'd really appreciate it.",
  },
}

async function resolveTemplate(event: CustomerEmailEvent): Promise<TemplateConfig> {
  try {
    const [row] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.key, event))
      .limit(1)

    if (row) {
      return {
        subject: (ref) => row.subject.replace('{ref}', ref),
        bannerColor: row.bannerColor,
        bannerLabel: row.bannerLabel,
        body: row.body,
      }
    }
  } catch {
    // DB unavailable — fall through to hardcoded defaults
  }
  return HARDCODED_TEMPLATES[event]
}

export async function sendCustomerEmail(input: CustomerEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Missing RESEND_API_KEY environment variable')

  const from = process.env.RESEND_FROM
  if (!from) throw new Error('Missing RESEND_FROM environment variable')

  const resend = new Resend(apiKey)

  const ref = input.orderReference.slice(-10).toUpperCase()
  const total = '₦' + input.totalNaira.toLocaleString('en-NG')
  const firstName = input.customerName.split(' ')[0] || input.customerName
  const config = await resolveTemplate(input.event)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'
  const reviewUrl = `${siteUrl}/review?ref=${encodeURIComponent(input.orderReference)}`

  const html = buildHtml({
    bannerColor: config.bannerColor,
    bannerLabel: config.bannerLabel,
    firstName: escapeHtml(firstName),
    body: config.body,
    ref: escapeHtml(`#${ref}`),
    total: escapeHtml(total),
    trackingNumber: input.trackingNumber ?? null,
    items: input.items ?? [],
    event: input.event,
    reviewUrl,
  })

  const itemsText = (input.items ?? []).map((item) => {
    const label = [
      item.productName,
      item.variantName,
      item.tierQty > 1 ? `Pack of ${item.tierQty}` : null,
      item.threadColour,
    ].filter(Boolean).join(' · ')
    return `  ${label} × ${item.quantity} — ₦${item.lineTotal.toLocaleString('en-NG')}`
  }).join('\n')

  const subject = config.subject(ref)

  const text = [
    `Hi ${firstName},`,
    '',
    config.body,
    '',
    ...(itemsText ? ['Your items:', itemsText, ''] : []),
    `Order: #${ref}`,
    `Total: ${total}`,
    ...(input.trackingNumber ? [`Tracking: ${input.trackingNumber}`] : []),
    ...(input.event === 'delivered' || input.event === 'review_reminder' ? ['', `Share your experience: ${reviewUrl}`] : []),
    '',
    `Questions? Email us at ${BUSINESS.support.email} or reach us on WhatsApp: ${BUSINESS.whatsapp.url()}`,
    '',
    '— Twinkle Locs',
  ].join('\n')

  let resendMessageId: string | null = null
  let logStatus: 'sent' | 'failed' = 'sent'
  let logError: string | null = null

  try {
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
      text,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Resend error')
    }
    resendMessageId = result.data?.id ?? null
  } catch (err) {
    logStatus = 'failed'
    logError = err instanceof Error ? err.message : 'Unknown error'
  }

  db.insert(emailLogs).values({
    to: [input.to],
    subject,
    templateKey: input.event,
    orderId: input.orderId ?? null,
    resendMessageId,
    status: logStatus,
    error: logError,
    htmlBody: html,
    textBody: text,
    sentAt: logStatus === 'sent' ? new Date() : null,
  }).catch((e) => console.error('[emailLogs] insert failed:', e))

  if (logStatus === 'failed') {
    throw new Error(logError ?? 'Email send failed')
  }
}

// Atomically records intent to send a status email.
// Returns the new row's id if this event hasn't been sent yet, or null if already sent.
export async function tryClaimStatusEmail(
  orderId: string,
  event: CustomerEmailEvent
): Promise<string | null> {
  const [inserted] = await db
    .insert(orderStatusEmails)
    .values({ orderId, eventType: event })
    .onConflictDoNothing()
    .returning({ id: orderStatusEmails.id })
  return inserted?.id ?? null
}

// Removes a claimed record so the email can be retried on the next attempt.
export async function releaseStatusEmailClaim(id: string): Promise<void> {
  await db.delete(orderStatusEmails).where(eq(orderStatusEmails.id, id))
}

function buildItemsRows(items: OrderEmailItem[]): string {
  if (!items.length) return ''

  const rows = items.map((item) => {
    const label = [
      item.variantName,
      item.tierQty > 1 ? `Pack of ${item.tierQty}` : null,
      item.threadColour ? escapeHtml(item.threadColour) : null,
    ].filter(Boolean).join(' · ')

    return `<tr>
      <td style="padding:8px 0 8px 0;border-bottom:1px solid #f0efee;vertical-align:top;">
        <div style="font-size:13px;color:#1c1917;font-weight:600;">${escapeHtml(item.productName)}</div>
        <div style="font-size:12px;color:#78716c;margin-top:1px;">${label} &times; ${item.quantity}</div>
      </td>
      <td style="padding:8px 0 8px 8px;border-bottom:1px solid #f0efee;text-align:right;white-space:nowrap;vertical-align:top;font-size:13px;color:#1c1917;">&#8358;${item.lineTotal.toLocaleString('en-NG')}</td>
    </tr>`
  }).join('')

  return `<tr>
    <td style="padding-top:20px;">
      <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Order items</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </td>
  </tr>`
}

function buildHtml(params: {
  bannerColor: string
  bannerLabel: string
  firstName: string
  body: string
  ref: string
  total: string
  trackingNumber: string | null
  items: OrderEmailItem[]
  event: CustomerEmailEvent
  reviewUrl: string
}): string {
  const trackingRow = params.trackingNumber
    ? `<tr>
        <td style="padding-top:12px;border-top:1px solid #e7e5e4;">
          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Tracking number</div>
          <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:14px;color:#1c1917;font-weight:600;">${escapeHtml(params.trackingNumber)}</div>
        </td>
      </tr>`
    : ''

  const reviewSection = params.event === 'delivered' || params.event === 'review_reminder'
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;margin-top:24px;">
        <tr>
          <td style="padding:20px 24px;text-align:center;">
            <div style="font-size:15px;color:#1c1917;font-weight:600;margin-bottom:6px;">Loved your order?</div>
            <div style="font-size:13px;color:#78716c;margin-bottom:16px;">A quick review helps other loc lovers discover us.</div>
            <a href="${params.reviewUrl}" style="display:inline-block;background-color:#d4a843;color:#ffffff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;">Leave a Review &rarr;</a>
          </td>
        </tr>
      </table>`
    : ''

  const itemsRows = buildItemsRows(params.items)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="background-color:#1c1917;border-radius:8px 8px 0 0;padding:24px 32px;">
              <div style="font-size:20px;font-weight:700;color:#d4a843;letter-spacing:0.1em;text-transform:uppercase;">Twinkle Locs</div>
              <div style="font-size:11px;color:#a8a29e;margin-top:3px;letter-spacing:0.03em;">loc bead accessories</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:${params.bannerColor};padding:12px 32px;">
              <span style="font-size:13px;font-weight:600;color:#ffffff;letter-spacing:0.02em;">${params.bannerLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#1c1917;font-weight:600;">Hi ${params.firstName},</p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#44403c;line-height:1.7;">${params.body}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order reference</div>
                          <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:15px;color:#1c1917;font-weight:600;">${params.ref}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;border-top:1px solid #e7e5e4;">
                          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order total</div>
                          <div style="font-size:17px;color:#1c1917;font-weight:700;">${params.total}</div>
                        </td>
                      </tr>
                      ${itemsRows}
                      ${trackingRow}
                    </table>
                  </td>
                </tr>
              </table>

              ${reviewSection}

              <p style="margin:${params.event === 'delivered' || params.event === 'review_reminder' ? '24px' : '0'} 0 0 0;font-size:13px;color:#78716c;line-height:1.7;">
                Have a question? Reply to this email or reach us on
                <a href="${BUSINESS.whatsapp.url()}" style="color:#d4a843;text-decoration:none;font-weight:500;">WhatsApp</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f5f5f4;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 8px 8px;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a8a29e;">© 2025 Twinkle Locs &nbsp;·&nbsp; <a href="mailto:${BUSINESS.support.email}" style="color:#a8a29e;text-decoration:none;">${BUSINESS.support.email}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
