import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import Link from 'next/link'
import { orders, abandonedOrders as abandonedOrdersTable } from '@/db'
import { count, desc, eq } from 'drizzle-orm'
import { Order } from '@/types/db'
import { OrdersTable } from '../../../_components/OrdersTable'
import { RecoverOrderForm } from '../../../_components/RecoverOrderForm'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminOrdersPage() {
  await requireAdminSession()

  const [ordersRows, unrecoveredCount] = await Promise.all([
    db
      .select({
        id: orders.id,
        createdAt: orders.createdAt,
        paystackReference: orders.paystackReference,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .catch((e) => { console.error('Failed to fetch orders:', e); return [] }),
    // Just the count here; the list has its own page (Abandoned Orders in the sidebar)
    db
      .select({ n: count() })
      .from(abandonedOrdersTable)
      .where(eq(abandonedOrdersTable.recovered, false))
      .then((r) => r[0]?.n ?? 0)
      .catch((e) => { console.error('Failed to count abandoned orders:', e); return 0 }),
  ])

  const ordersList: Order[] = ordersRows.map((r) => ({
    id: r.id,
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    paystack_reference: r.paystackReference,
    paystack_payload: null,
    status: r.status,
    customer_name: r.customerName,
    customer_email: '',
    customer_phone: '',
    customer_ip: null,
    delivery_address: '',
    delivery_state: '',
    shipping_cost: 0,
    subtotal: 0,
    total: r.total,
    tracking_number: r.trackingNumber ?? null,
  }))

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">
          Orders
        </h1>
        <p className="text-stone-400 text-sm">
          {ordersList.length} {ordersList.length === 1 ? 'order' : 'orders'} total
        </p>
      </div>

      <RecoverOrderForm />
      <OrdersTable orders={ordersList} />

      {unrecoveredCount > 0 && (
        <Link
          href="/admin/abandoned-orders"
          className="flex items-center justify-between gap-4 rounded-xl border border-stone-700 bg-stone-800/50 px-5 py-4 hover:border-gold/60 transition-colors"
        >
          <span>
            <span className="block font-heading font-semibold text-white">
              {unrecoveredCount} abandoned {unrecoveredCount === 1 ? 'checkout' : 'checkouts'}
            </span>
            <span className="block text-sm text-stone-400">Customers who filled in their details but didn&apos;t pay. Worth a follow-up.</span>
          </span>
          <span className="shrink-0 text-sm text-gold-light">View →</span>
        </Link>
      )}
    </div>
  )
}
