import { sendEmail } from '@/lib/email/client'
import { escapeHtml } from '@/lib/email/orderTemplate'

/**
 * "New order" email to the shop. Reply-To is the customer, so Unoma can answer
 * them straight from her inbox. Logged like every other send; the idempotency
 * key stops a webhook retry from emailing her twice about the same order.
 */
export async function sendAdminOrderEmail(input: {
  to: string
  order: {
    reference: string
    customerName: string
    customerEmail: string
    customerPhone: string
    deliveryState: string
    totalNaira: number
    itemCount: number
    amountPaidNaira?: number | null
    /** Set when the charge didn't match server-side pricing (order status 'payment_review') */
    paymentIssue?: string | null
    orderId?: string | null
  }
}): Promise<void> {
  const o = input.order
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')
  const adminUrl = o.orderId ? `${siteUrl}/admin/orders/${o.orderId}` : `${siteUrl}/admin/orders`
  const formattedTotal = `₦${o.totalNaira.toLocaleString('en-NG')}`
  const paid = typeof o.amountPaidNaira === 'number' ? `₦${o.amountPaidNaira.toLocaleString('en-NG')}` : null
  const issue = o.paymentIssue

  const subject = issue ? `CHECK PAYMENT before shipping: ${o.reference}` : `New order ${formattedTotal}: ${o.customerName} (${o.deliveryState})`

  const rows: [string, string][] = [
    ['Customer', o.customerName],
    ['Email', o.customerEmail],
    ['Phone', o.customerPhone],
    ['Delivery state', o.deliveryState],
    ['Items', String(o.itemCount)],
    ['Order total', formattedTotal],
    ...(paid ? ([['Amount paid', paid]] as [string, string][]) : []),
    ['Reference', o.reference],
  ]

  const text = [
    subject,
    '',
    ...(issue
      ? [
          'This payment did not match the order total, so the order is on hold (status: payment review)',
          'and the customer has NOT been sent a confirmation. Check Paystack, then contact the customer.',
          '',
          `Issue: ${issue}`,
          '',
        ]
      : []),
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Open the order: ${adminUrl}`,
    'Reply to this email to answer the customer directly.',
  ].join('\n')

  const html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial;max-width:560px;">
  <h2 style="margin:0 0 12px;color:#1A3C34;">${escapeHtml(subject)}</h2>
  ${
    issue
      ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;color:#78350f;">
          <strong>Payment doesn't match the order. Don't ship yet.</strong><br/>
          The order is on hold (payment review) and the customer has not been sent a confirmation.<br/><br/>
          ${escapeHtml(issue)}
        </div>`
      : ''
  }
  <table style="border-collapse:collapse;font-size:14px;">
    ${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#57534e;"><strong>${escapeHtml(k)}</strong></td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  <p style="margin:20px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#1A3C34;color:#E8E0D0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open the order</a></p>
  <p style="margin:12px 0 0;font-size:12px;color:#78716c;">Reply to this email to answer ${escapeHtml(o.customerName)} directly.</p>
</div>`

  const result = await sendEmail({
    to: input.to,
    subject,
    html,
    text,
    category: 'admin',
    templateKey: 'admin_new_order',
    orderId: o.orderId ?? null,
    replyTo: o.customerEmail,
    idempotencyKey: `admin-order:${o.reference}`,
  })
  if (!result.ok) throw new Error(result.error)
}
