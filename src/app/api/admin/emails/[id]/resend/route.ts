import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailLogs, orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'
import { sendCustomerEmail, type CustomerEmailEvent, type OrderEmailItem } from '@/lib/notifications/customerEmail'
import { sendEmail } from '@/lib/email/client'

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
        force: true, // the admin asked for it again: bypass the duplicate guard
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

  const result = await sendEmail({
    to: log.to,
    subject: log.subject,
    html: log.htmlBody ?? '',
    text: log.textBody ?? '',
    category: 'custom',
    templateKey: log.templateKey,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ sent: true, resendMessageId: result.id })
}
