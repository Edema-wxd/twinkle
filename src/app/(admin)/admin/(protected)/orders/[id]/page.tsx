import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { orders } from '@/db'
import { eq } from 'drizzle-orm'
import { Order, OrderItem } from '@/types/supabase'
import { OrderStatusSelect } from '../../../../_components/OrderStatusSelect'

type FullOrder = Order & { order_items: OrderItem[] }

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-gold/10 text-gold border border-gold/30',
  processing: 'bg-blue-900/40 text-blue-400 border border-blue-800',
  shipped: 'bg-purple-900/40 text-purple-400 border border-purple-800',
  delivered: 'bg-green-900/40 text-green-400 border border-green-800',
}

function statusStyle(status: string): string {
  return (
    STATUS_STYLES[status] ??
    'bg-stone-700 text-stone-300 border border-stone-600'
  )
}

function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG')
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  // Belt-and-braces auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { id } = await params

  const result = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { orderItems: true },
  })

  if (!result) {
    notFound()
  }

  // Map camelCase Drizzle row to snake_case FullOrder shape
  const order: FullOrder = {
    id: result.id,
    created_at: result.createdAt instanceof Date ? result.createdAt.toISOString() : String(result.createdAt),
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
      created_at: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
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

  const subtotal = order.order_items.reduce(
    (sum, item) => sum + item.line_total,
    0
  )

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <Link
            href="/admin/orders"
            className="text-stone-400 hover:text-white text-sm transition-colors mb-2 inline-flex items-center gap-1"
          >
            <span aria-hidden>&#8592;</span> Back to Orders
          </Link>
          <h1 className="font-heading text-2xl font-bold text-white">
            Order #{order.paystack_reference.slice(-10).toUpperCase()}
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {formatDate(order.created_at)}
          </p>
        </div>

        {/* Status badge + inline update */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusStyle(order.status)}`}
          >
            {order.status}
          </span>
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      {/* Section 1 — Customer & Delivery */}
      <section className="bg-stone-900 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white border-b border-stone-700 pb-3">
          Customer &amp; Delivery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Customer Name
            </p>
            <p className="text-white font-medium">{order.customer_name}</p>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Email
            </p>
            <p className="text-white">{order.customer_email}</p>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              WhatsApp / Phone
            </p>
            <a
              href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              {order.customer_phone}
            </a>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Delivery State
            </p>
            <p className="text-white">{order.delivery_state}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Delivery Address
            </p>
            <p className="text-white">{order.delivery_address}</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="border-t border-stone-700 pt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Order Total
            </p>
            <p className="text-white font-semibold text-base">
              {formatNaira(order.total)}
            </p>
          </div>
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
              Payment Ref
            </p>
            <p className="text-stone-300 font-mono text-xs">
              {order.paystack_reference}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Line Items */}
      <section className="bg-stone-900 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-white p-6 border-b border-stone-700">
          Line Items
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-800 text-stone-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Variant</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                  Thread Colour
                </th>
                <th className="px-4 py-3 text-right font-medium">Pack Qty</th>
                <th className="px-4 py-3 text-right font-medium hidden md:table-cell">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {order.order_items.map((item) => (
                <tr
                  key={item.id}
                  className="bg-stone-900 hover:bg-stone-800 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3 text-stone-300">
                    {item.variant_name}
                  </td>
                  <td className="px-4 py-3 text-stone-300 hidden sm:table-cell">
                    {item.thread_colour ?? (
                      <span className="text-stone-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-300 text-right">
                    {item.tier_qty}
                  </td>
                  <td className="px-4 py-3 text-stone-300 text-right hidden md:table-cell">
                    {formatNaira(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-white text-right font-medium">
                    {formatNaira(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer totals — colSpan=5 spans all columns except the value column */}
            <tfoot className="bg-stone-800 text-stone-300 text-sm">
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-2 text-right text-stone-400"
                >
                  Subtotal
                </td>
                <td className="px-4 py-2 text-right">{formatNaira(subtotal)}</td>
              </tr>
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-2 text-right text-stone-400"
                >
                  Shipping ({order.delivery_state})
                </td>
                <td className="px-4 py-2 text-right">
                  {formatNaira(order.shipping_cost)}
                </td>
              </tr>
              <tr className="border-t border-stone-700">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right font-semibold text-white"
                >
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-white text-base">
                  {formatNaira(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}
