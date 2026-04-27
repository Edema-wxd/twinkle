import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { abandonedOrders } from '@/db'
import { eq } from 'drizzle-orm'

const SITE_URL = 'https://twinklelocs.com'

interface CartItemSnapshot {
  productId: string
  productName: string
  variantId: string
  variantName: string
  tierQty: number
  threadColour: string
  unitPrice: number
  quantity: number
  isTool: boolean
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

export default async function AbandonedOrderDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { id } = await params

  const [row] = await db
    .select()
    .from(abandonedOrders)
    .where(eq(abandonedOrders.id, id))
    .limit(1)

  if (!row) {
    notFound()
  }

  // Map camelCase Drizzle row to the shape used in this page
  const order = {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    customer_name: row.customerName,
    customer_email: row.customerEmail,
    customer_phone: row.customerPhone,
    delivery_address: row.deliveryAddress,
    delivery_state: row.deliveryState,
    shipping_cost: Number(row.shippingCost),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    cart_items: row.cartItems,
    recovered: row.recovered,
    recovered_at: row.recoveredAt instanceof Date ? row.recoveredAt.toISOString() : (row.recoveredAt ?? null),
  }

  const cartItems = (order.cart_items as unknown as CartItemSnapshot[]) ?? []

  const whatsappMessage = encodeURIComponent(
    `Hi ${order.customer_name.split(' ')[0]}, we noticed you left some items in your Twinkle Locs cart! Your order totalling ${formatNaira(order.total)} is still waiting for you. Complete your purchase here: ${SITE_URL}/cart`
  )
  const mailtoSubject = encodeURIComponent('Complete your Twinkle Locs order')
  const mailtoBody = encodeURIComponent(
    `Hi ${order.customer_name.split(' ')[0]},\n\nWe noticed you left some items in your Twinkle Locs cart!\n\nYour order totalling ${formatNaira(order.total)} is still waiting for you.\n\nComplete your purchase at twinklelocs.com/cart\n\nTwinkle Locs team`
  )

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <Link
            href="/admin/orders"
            className="text-stone-400 hover:text-white text-sm transition-colors mb-2 inline-flex items-center gap-1"
          >
            <span aria-hidden>&#8592;</span> Back to Orders
          </Link>
          <h1 className="font-heading text-2xl font-bold text-white">
            Abandoned Checkout
          </h1>
          <p className="text-stone-400 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>

        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium self-start ${
            order.recovered
              ? 'bg-green-900/50 text-green-400 border border-green-800'
              : 'bg-amber-900/50 text-amber-400 border border-amber-800'
          }`}
        >
          {order.recovered ? 'Recovered' : 'Abandoned'}
        </span>
      </div>

      {/* Customer & Delivery */}
      <section className="bg-stone-900 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white border-b border-stone-700 pb-3">
          Customer &amp; Delivery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Customer Name</p>
            <p className="text-white font-medium">{order.customer_name}</p>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Email</p>
            <a
              href={`mailto:${order.customer_email}?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {order.customer_email}
            </a>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">WhatsApp / Phone</p>
            <a
              href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              {order.customer_phone}
            </a>
          </div>

          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Delivery State</p>
            <p className="text-white">{order.delivery_state}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Delivery Address</p>
            <p className="text-white">{order.delivery_address}</p>
          </div>
        </div>

        <div className="border-t border-stone-700 pt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Order Total</p>
            <p className="text-white font-semibold text-base">{formatNaira(order.total)}</p>
          </div>
          {order.recovered && order.recovered_at && (
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Recovered At</p>
              <p className="text-green-400 text-sm">{formatDate(order.recovered_at)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Follow-up actions */}
      {!order.recovered && (
        <section className="bg-stone-900 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white border-b border-stone-700 pb-3 mb-4">
            Follow Up
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1da851] transition-colors"
            >
              Message on WhatsApp
            </a>
            <a
              href={`mailto:${order.customer_email}?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="inline-flex items-center gap-2 bg-stone-700 text-stone-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-600 transition-colors"
            >
              Send Email
            </a>
          </div>
        </section>
      )}

      {/* Cart items */}
      <section className="bg-stone-900 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-white p-6 border-b border-stone-700">
          Cart Items
        </h2>

        {cartItems.length === 0 ? (
          <p className="p-6 text-stone-400 text-sm">No cart items recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-800 text-stone-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Variant</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Thread Colour</th>
                  <th className="px-4 py-3 text-right font-medium">Pack Qty</th>
                  <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {cartItems.map((item, i) => {
                  const lineTotal = item.unitPrice * item.quantity
                  return (
                    <tr key={i} className="bg-stone-900 hover:bg-stone-800 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-stone-300">{item.variantName}</td>
                      <td className="px-4 py-3 text-stone-300 hidden sm:table-cell">
                        {item.isTool || !item.threadColour ? (
                          <span className="text-stone-500">—</span>
                        ) : (
                          item.threadColour
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-300 text-right">{item.tierQty}</td>
                      <td className="px-4 py-3 text-stone-300 text-right hidden md:table-cell">
                        {formatNaira(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-stone-300 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-white text-right font-medium">
                        {formatNaira(lineTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot className="bg-stone-800 text-stone-300 text-sm">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right text-stone-400">Subtotal</td>
                  <td className="px-4 py-2 text-right">{formatNaira(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right text-stone-400">
                    Shipping ({order.delivery_state})
                  </td>
                  <td className="px-4 py-2 text-right">{formatNaira(order.shipping_cost)}</td>
                </tr>
                <tr className="border-t border-stone-700">
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold text-white">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white text-base">
                    {formatNaira(order.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
