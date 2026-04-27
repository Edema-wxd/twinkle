import { db } from '@/db'
import { orders } from '@/db'
import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params

  const result = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, reference),
    with: { orderItems: true },
  })

  if (!result) {
    return Response.json(null, { status: 404 })
  }

  // Map camelCase Drizzle result to snake_case shape for the client poller
  const data = {
    id: result.id,
    created_at: result.createdAt.toISOString(),
    paystack_reference: result.paystackReference,
    paystack_payload: result.paystackPayload,
    status: result.status,
    customer_name: result.customerName,
    customer_email: result.customerEmail,
    customer_phone: result.customerPhone,
    customer_ip: result.customerIp ?? null,
    delivery_address: result.deliveryAddress,
    delivery_state: result.deliveryState,
    shipping_cost: result.shippingCost,
    subtotal: result.subtotal,
    total: result.total,
    order_items: result.orderItems.map((item) => ({
      id: item.id,
      order_id: item.orderId,
      created_at: item.createdAt.toISOString(),
      product_id: item.productId,
      product_name: item.productName,
      variant_id: item.variantId,
      variant_name: item.variantName,
      tier_qty: item.tierQty,
      thread_colour: item.threadColour ?? null,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
  }

  return Response.json(data)
}
