import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { requireAdminSession } from '@/lib/auth/server'
import { db, abandonedOrders as abandonedOrdersTable } from '@/db'
import type { AbandonedOrder } from '@/types/db'
import { ABANDONED_RETENTION_DAYS, deleteExpiredAbandonedOrders } from '@/lib/checkout/abandonedRetention'
import { AbandonedOrdersTable } from '../../../_components/AbandonedOrdersTable'

/** Customers who filled in their details at checkout but didn't pay: worth a follow-up. */
export default async function AdminAbandonedOrdersPage() {
  // Layout checks too, but pages never trust the layout alone (CVE-2025-29927)
  await requireAdminSession()

  // Keep the privacy promise even if nobody has checked out recently
  await deleteExpiredAbandonedOrders().catch((e) => console.error('Abandoned-order clean-up failed:', e))

  let loadFailed = false
  const rows = await db
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
    .limit(200)
    .catch((e) => {
      console.error('Failed to fetch abandoned orders:', e)
      loadFailed = true
      return []
    })

  const list: AbandonedOrder[] = rows.map((r) => ({
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
  const unrecovered = list.filter((o) => !o.recovered).length

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Abandoned checkouts</h1>
        <p className="text-stone-400 text-sm">
          {unrecovered} unrecovered: customers who filled in their details but didn&apos;t complete payment. Open one to message them on
          WhatsApp or email. Paid orders are on the <Link href="/admin/orders" className="text-gold-light underline">Orders</Link> page.
          Checkouts older than {ABANDONED_RETENTION_DAYS} days are deleted automatically, as the privacy policy promises.
        </p>
      </div>
      {loadFailed ? (
        <p role="alert" className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          Couldn’t load abandoned checkouts. Refresh the page to try again.
        </p>
      ) : (
        <AbandonedOrdersTable abandonedOrders={list} />
      )}
    </div>
  )
}
