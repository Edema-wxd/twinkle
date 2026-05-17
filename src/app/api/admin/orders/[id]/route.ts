import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'
import {
  sendCustomerEmail,
  tryClaimStatusEmail,
  releaseStatusEmailClaim,
  type CustomerEmailEvent,
  type OrderEmailItem,
} from '@/lib/notifications/customerEmail'

const VALID_STATUSES = ['paid', 'processing', 'shipped', 'delivered'] as const
type OrderStatus = (typeof VALID_STATUSES)[number]

function isValidStatus(s: string): s is OrderStatus {
  return (VALID_STATUSES as readonly string[]).includes(s)
}

const NOTIFIABLE_STATUSES: OrderStatus[] = ['processing', 'shipped', 'delivered']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { status?: string; trackingNumber?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { status, trackingNumber } = body

  if (!status || !isValidStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Fetch order + items in parallel for email enrichment
  const [existingRows, itemRows] = await Promise.all([
    db
      .select({
        id: orders.id,
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

  const existing = existingRows[0]
  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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

  const cleanTracking = status === 'shipped' && trackingNumber?.trim()
    ? trackingNumber.trim()
    : undefined

  try {
    if (cleanTracking) {
      await db.update(orders).set({ status, trackingNumber: cleanTracking }).where(eq(orders.id, id))
    } else {
      await db.update(orders).set({ status }).where(eq(orders.id, id))
    }
  } catch (err) {
    console.error('Failed to update order status:', err)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }

  if (NOTIFIABLE_STATUSES.includes(status)) {
    const claimId = await tryClaimStatusEmail(id, status as CustomerEmailEvent).catch(() => null)
    if (claimId) {
      sendCustomerEmail({
        to: existing.customerEmail,
        customerName: existing.customerName,
        orderReference: existing.paystackReference,
        totalNaira: existing.total,
        event: status as CustomerEmailEvent,
        trackingNumber: cleanTracking ?? null,
        items: emailItems,
        orderId: id,
      }).catch(async (err) => {
        console.error('[order-status] Customer email failed:', {
          orderId: id,
          status,
          error: String(err).slice(0, 500),
        })
        await releaseStatusEmailClaim(claimId).catch(() => null)
      })
    }
  }

  return NextResponse.json({ id, status })
}
