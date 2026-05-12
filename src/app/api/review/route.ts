import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders, orderItems, reviews } from '@/db'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ref, productId, rating, body: reviewBody } = body as {
    ref?: unknown
    productId?: unknown
    rating?: unknown
    body?: unknown
  }

  if (!ref || typeof ref !== 'string' || ref.trim() === '') {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 })
  }
  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }
  if (!reviewBody || typeof reviewBody !== 'string' || reviewBody.trim() === '') {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }
  if (
    rating === undefined ||
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
  }

  // Look up the order by paystack reference
  const [order] = await db
    .select({ id: orders.id, customerName: orders.customerName })
    .from(orders)
    .where(eq(orders.paystackReference, ref.trim()))
    .limit(1)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Verify the product was actually in this order
  const [item] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, order.id), eq(orderItems.productId, productId.trim())))
    .limit(1)

  if (!item) {
    return NextResponse.json({ error: 'Product not found in this order' }, { status: 400 })
  }

  try {
    const [review] = await db
      .insert(reviews)
      .values({
        productId: productId.trim(),
        authorName: order.customerName,
        body: reviewBody.trim(),
        rating,
      })
      .returning({ id: reviews.id })

    return NextResponse.json({ id: review?.id }, { status: 201 })
  } catch (err) {
    console.error('[review] Failed to insert:', err)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
