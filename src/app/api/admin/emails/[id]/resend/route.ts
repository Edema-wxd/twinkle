import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs, orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'
import { sendCustomerEmail, type CustomerEmailEvent, type OrderEmailItem } from '@/lib/notifications/customerEmail'
import { Resend } from 'resend'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [log] = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.id, id))
    .limit(1)

  if (!log) return NextResponse.json({ error: 'Email log not found' }, { status: 404 })

  // Order email — rebuild from DB and resend via sendCustomerEmail
  if (log.orderId && log.templateKey) {
    const [order] = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        paystackReference: orders.paystackReference,
        total: orders.total,
        trackingNumber: orders.trackingNumber,
      })
      .from(orders)
      .where(eq(orders.id, log.orderId))
      .limit(1)

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const itemRows = await db
      .select({
        productName: orderItems.productName,
        variantName: orderItems.variantName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        tierQty: orderItems.tierQty,
        threadColour: orderItems.threadColour,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))

    const emailItems: OrderEmailItem[] = itemRows.map((r) => ({
      productName: r.productName,
      variantName: r.variantName,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      lineTotal: r.lineTotal,
      tierQty: r.tierQty,
      threadColour: r.threadColour ?? null,
    }))

    try {
      await sendCustomerEmail({
        to: order.customerEmail,
        customerName: order.customerName,
        orderReference: order.paystackReference,
        totalNaira: order.total,
        event: log.templateKey as CustomerEmailEvent,
        trackingNumber: order.trackingNumber,
        items: emailItems,
        orderId: order.id,
      })
      return NextResponse.json({ sent: true })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to resend' },
        { status: 502 }
      )
    }
  }

  // Custom email — resend stored html/text directly
  if (!log.htmlBody && !log.textBody) {
    return NextResponse.json({ error: 'No email body stored — cannot resend' }, { status: 422 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  let resendMessageId: string | null = null
  let logStatus: 'sent' | 'failed' = 'sent'
  let logError: string | null = null

  try {
    const result = await resend.emails.send({
      from,
      to: log.to,
      subject: log.subject,
      html: log.htmlBody ?? '',
      text: log.textBody ?? '',
    })
    if (result.error) throw new Error(result.error.message ?? 'Resend error')
    resendMessageId = result.data?.id ?? null
  } catch (err) {
    logStatus = 'failed'
    logError = err instanceof Error ? err.message : 'Unknown error'
  }

  await db.insert(emailLogs).values({
    to: log.to,
    subject: log.subject,
    templateKey: null,
    orderId: null,
    resendMessageId,
    status: logStatus,
    error: logError,
    htmlBody: log.htmlBody,
    textBody: log.textBody,
    sentAt: logStatus === 'sent' ? new Date() : null,
  }).catch(console.error)

  if (logStatus === 'failed') {
    return NextResponse.json({ error: logError }, { status: 502 })
  }

  return NextResponse.json({ sent: true, resendMessageId })
}
