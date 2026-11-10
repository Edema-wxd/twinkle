import { Resend } from 'resend'

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
  }
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  const from = process.env.RESEND_FROM
  if (!from) {
    throw new Error('Missing RESEND_FROM environment variable')
  }

  const resend = new Resend(apiKey)

  const formattedTotal = `₦${input.order.totalNaira.toLocaleString('en-NG')}`

  const issue = input.order.paymentIssue
  const subject = issue
    ? `CHECK PAYMENT before shipping: ${input.order.reference}`
    : `New order: ${input.order.reference}`
  const paid = typeof input.order.amountPaidNaira === 'number' ? `₦${input.order.amountPaidNaira.toLocaleString('en-NG')}` : null

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
    `Customer name: ${input.order.customerName}`,
    `Customer email: ${input.order.customerEmail}`,
    `Customer phone: ${input.order.customerPhone}`,
    `Delivery state: ${input.order.deliveryState}`,
    `Items: ${input.order.itemCount}`,
    `Total: ${formattedTotal}`,
    ...(paid ? [`Amount paid: ${paid}`] : []),
  ].join('\n')

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
      ${
        issue
          ? `<div style="margin: 0 0 16px; padding: 12px 14px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; color: #78350f;">
               <strong>Payment doesn't match the order. Don't ship yet.</strong><br/>
               The order is on hold (payment review) and the customer has not been sent a confirmation.<br/><br/>
               ${escapeHtml(issue)}
             </div>`
          : ''
      }
      <table style="border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Customer name</strong></td><td style="padding: 4px 0;">${escapeHtml(
          input.order.customerName
        )}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Customer email</strong></td><td style="padding: 4px 0;">${escapeHtml(
          input.order.customerEmail
        )}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Delivery state</strong></td><td style="padding: 4px 0;">${escapeHtml(
          input.order.deliveryState
        )}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Items</strong></td><td style="padding: 4px 0;">${input.order.itemCount}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0;"><strong>Total</strong></td><td style="padding: 4px 0;">${escapeHtml(
          formattedTotal
        )}</td></tr>
        ${paid ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Amount paid</strong></td><td style="padding: 4px 0;">${escapeHtml(paid)}</td></tr>` : ''}
      </table>
    </div>
  `

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text,
    html,
  })

  if (result.error) {
    throw new Error(result.error.message ?? 'Resend error')
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

