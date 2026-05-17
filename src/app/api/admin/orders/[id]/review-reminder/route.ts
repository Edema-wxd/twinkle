import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'
import {
  sendCustomerEmail,
  tryClaimStatusEmail,
  releaseStatusEmailClaim,
  type OrderEmailItem,
} from '@/lib/notifications/customerEmail'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [existingRows, itemRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        paystackReference: orders.paystackReference,
        total: orders.total,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1),
    db
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
      .where(eq(orderItems.orderId, id)),
  ])

  const order = existingRows[0]
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'Review reminders can only be sent for delivered orders' },
      { status: 422 }
    )
  }

  const claimId = await tryClaimStatusEmail(id, 'review_reminder').catch(() => null)
  if (!claimId) {
    return NextResponse.json({ sent: false, alreadySent: true })
  }

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
      event: 'review_reminder',
      items: emailItems,
      orderId: order.id,
    })
    return NextResponse.json({ sent: true })
  } catch (err) {
    await releaseStatusEmailClaim(claimId).catch(() => null)
    console.error('[review-reminder] Email failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
