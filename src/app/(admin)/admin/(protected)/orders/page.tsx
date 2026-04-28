import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { orders, abandonedOrders as abandonedOrdersTable } from '@/db'
import { desc } from 'drizzle-orm'
import { Order, AbandonedOrder } from '@/types/db'
import { OrdersTable } from '../../../_components/OrdersTable'
import { AbandonedOrdersTable } from '../../../_components/AbandonedOrdersTable'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminOrdersPage() {
  await requireAdminSession()

  const [ordersRows, abandonedRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        createdAt: orders.createdAt,
        paystackReference: orders.paystackReference,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .catch((e) => { console.error('Failed to fetch orders:', e); return [] }),
    db
      .select({
        id: abandonedOrdersTable.id,
        createdAt: abandonedOrdersTable.createdAt,
        customerName: abandonedOrdersTable.customerName,
        customerEmail: abandonedOrdersTable.customerEmail,
        customerPhone: abandonedOrdersTable.customerPhone,
        total: abandonedOrdersTable.total,
        recovered: abandonedOrdersTable.recovered,
        recoveredAt: abandonedOrdersTable.recoveredAt,
      })
      .from(abandonedOrdersTable)
      .orderBy(desc(abandonedOrdersTable.createdAt))
      .limit(100)
      .catch((e) => { console.error('Failed to fetch abandoned orders:', e); return [] }),
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
  }))

  const abandonedList: AbandonedOrder[] = abandonedRows.map((r) => ({
    id: r.id,
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    customer_name: r.customerName,
    customer_email: r.customerEmail,
    customer_phone: r.customerPhone,
    delivery_address: '',
    delivery_state: '',
    shipping_cost: 0,
    subtotal: 0,
    total: Number(r.total),
    cart_items: null,
    recovered: r.recovered,
    recovered_at: r.recoveredAt instanceof Date ? r.recoveredAt.toISOString() : (r.recoveredAt ?? null),
  }))

  const unrecoveredCount = abandonedList.filter((o) => !o.recovered).length

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

      <OrdersTable orders={ordersList} />

      <div>
        <h2 className="font-heading text-xl font-bold text-white mb-1">
          Abandoned Checkouts
        </h2>
        <p className="text-stone-400 text-sm mb-4">
          {unrecoveredCount} unrecovered &mdash; customers who filled in their details but didn&apos;t complete payment
        </p>
        <AbandonedOrdersTable abandonedOrders={abandonedList} />
      </div>
    </div>
  )
}
