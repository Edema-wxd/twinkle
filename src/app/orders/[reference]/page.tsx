import { db } from '@/db'
import { orders } from '@/db'
import { eq } from 'drizzle-orm'
import { Order, OrderItem, Json } from '@/types/supabase'
import { OrderConfirmationView } from './OrderConfirmationView'
import { OrderPoller } from './OrderPoller'

type FullOrder = Order & { order_items: OrderItem[] };

async function fetchOrderByReference(
  reference: string
): Promise<FullOrder | null> {
  const result = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, reference),
    with: { orderItems: true },
  })

  if (!result) return null

  // Map camelCase Drizzle result to snake_case shape expected by OrderConfirmationView
  const order: FullOrder = {
    id: result.id,
    created_at: result.createdAt.toISOString(),
    paystack_reference: result.paystackReference,
    paystack_payload: result.paystackPayload as Json,
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

  return order
}

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { reference } = await params;

  const order = await fetchOrderByReference(reference);

  if (order) {
    // Webhook arrived before page load — render confirmation immediately (no client JS needed)
    return <OrderConfirmationView order={order} />;
  }

  // Webhook still in flight — render client poller
  return <OrderPoller reference={reference} />;
}
