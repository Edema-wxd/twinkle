import { Resend } from 'resend'

export async function sendAdminOrderEmail(input: {
  to: string
  order: {
    reference: string
    customerName: string
    customerEmail: string
    customerPhone: string
    deliveryState: string
    totalKobo: number
    itemCount: number
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

  const totalNaira = input.order.totalKobo / 100
  const formattedTotal = `₦${totalNaira.toLocaleString('en-NG')}`

  const subject = `New order: ${input.order.reference}`

  const text = [
    `New order: ${input.order.reference}`,
    '',
    `Customer name: ${input.order.customerName}`,
    `Customer email: ${input.order.customerEmail}`,
    `Customer phone: ${input.order.customerPhone}`,
    `Delivery state: ${input.order.deliveryState}`,
    `Items: ${input.order.itemCount}`,
    `Total: ${formattedTotal}`,
  ].join('\n')

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin: 0 0 12px;">New order: ${escapeHtml(input.order.reference)}</h2>
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

