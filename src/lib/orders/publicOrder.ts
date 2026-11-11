import { eq } from 'drizzle-orm'
import { db, orders } from '@/db'
import { deliveryEstimateForOrder, getShippingInfo } from '@/lib/checkout/shippingInfo'

/**
 * What the customer's order page (/orders/[reference]) may show.
 *
 * The page is reachable by anyone holding the reference, and everything given
 * to it ends up in the HTML, so this deliberately leaves out the Paystack
 * payload (card bank and last 4 digits, IP address), email, phone and IP.
 */
export type PublicOrderStatus = 'payment_review' | 'paid' | 'processing' | 'shipped' | 'delivered'

export type PublicOrderItem = {
  id: string
  product_name: string
  variant_name: string
  tier_qty: number
  thread_colour: string | null
  quantity: number
  line_total: number
}

export type PublicOrder = {
  reference: string
  status: PublicOrderStatus
  created_at: string
  customer_name: string
  delivery_address: string
  delivery_state: string
  delivery_estimate: string
  tracking_number: string | null
  subtotal: number
  shipping_cost: number
  /** Money a promo code took off the items (free-delivery codes show as Free delivery instead) */
  discount: number
  total: number
  items: PublicOrderItem[]
}

const KNOWN: PublicOrderStatus[] = ['payment_review', 'paid', 'processing', 'shipped', 'delivered']

export async function getPublicOrder(reference: string): Promise<PublicOrder | null> {
  // Paystack references we create look like tw-<timestamp>-<random>; anything wildly different can't be ours
  if (!reference || reference.length > 100) return null

  const row = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, reference),
    with: { orderItems: true },
  })
  if (!row) return null

  const status = (KNOWN as string[]).includes(row.status) ? (row.status as PublicOrderStatus) : 'paid'

  return {
    reference: row.paystackReference,
    status,
    created_at: row.createdAt.toISOString(),
    customer_name: row.customerName,
    delivery_address: row.deliveryAddress,
    delivery_state: row.deliveryState,
    // Uses the payload server-side only (for the Lagos area); the payload itself isn't returned
    delivery_estimate: deliveryEstimateForOrder(await getShippingInfo(), row.deliveryState, row.paystackPayload),
    tracking_number: status === 'shipped' || status === 'delivered' ? (row.trackingNumber ?? null) : null,
    subtotal: row.subtotal,
    shipping_cost: row.shippingCost,
    discount: row.discountAmount > 0 ? row.discountAmount : Math.max(0, row.subtotal + row.shippingCost - row.total),
    total: row.total,
    items: row.orderItems.map((i) => ({
      id: i.id,
      product_name: i.productName,
      variant_name: i.variantName,
      tier_qty: i.tierQty,
      thread_colour: i.threadColour ?? null,
      quantity: i.quantity,
      line_total: i.lineTotal,
    })),
  }
}
