import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Order } from '@/types/supabase'
import { OrdersTable } from '../../../_components/OrdersTable'

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
  const { data: ordersData, error } = await adminClient
    .from('orders')
    .select(
      'id, created_at, paystack_reference, customer_name, total, status'
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch orders:', error)
  }

  const orders: Order[] = (ordersData as Order[]) ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">
          Orders
        </h1>
        <p className="text-stone-400 text-sm">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
        </p>
      </div>

      <OrdersTable orders={orders} />
    </div>
  )
}
