import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Order, AbandonedOrder } from '@/types/supabase'
import { OrdersTable } from '../../../_components/OrdersTable'
import { AbandonedOrdersTable } from '../../../_components/AbandonedOrdersTable'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const adminClient = createAdminClient()

  const [{ data: ordersData, error: ordersError }, { data: abandonedData, error: abandonedError }] =
    await Promise.all([
      adminClient
        .from('orders')
        .select('id, created_at, paystack_reference, customer_name, total, status')
        .order('created_at', { ascending: false }),
      adminClient
        .from('abandoned_orders')
        .select('id, created_at, customer_name, customer_email, customer_phone, total, recovered, recovered_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  if (ordersError) console.error('Failed to fetch orders:', ordersError)
  if (abandonedError) console.error('Failed to fetch abandoned orders:', abandonedError)

  const orders: Order[] = (ordersData as Order[]) ?? []
  const abandonedOrders: AbandonedOrder[] = (abandonedData as AbandonedOrder[]) ?? []
  const unrecoveredCount = abandonedOrders.filter((o) => !o.recovered).length

  return (
    <div className="p-6 lg:p-8 space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">
          Orders
        </h1>
        <p className="text-stone-400 text-sm">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
        </p>
      </div>

      <OrdersTable orders={orders} />

      <div>
        <h2 className="font-heading text-xl font-bold text-white mb-1">
          Abandoned Checkouts
        </h2>
        <p className="text-stone-400 text-sm mb-4">
          {unrecoveredCount} unrecovered &mdash; customers who filled in their details but didn&apos;t complete payment
        </p>
        <AbandonedOrdersTable abandonedOrders={abandonedOrders} />
      </div>
    </div>
  )
}
