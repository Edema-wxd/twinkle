import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Order } from '@/types/supabase'
import StatsPanel from '../../_components/StatsPanel'
import RecentOrdersTable from '../../_components/RecentOrdersTable'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Fetch all orders ordered by most recent first
  const adminClient = createAdminClient()
  const { data: ordersData, error } = await adminClient
    .from('orders')
    .select('id, created_at, status, customer_name, total, paystack_reference')
    .order('created_at', { ascending: false })

  const orders: Order[] = (ordersData as Order[]) ?? []

  if (error) {
    console.error('Failed to fetch orders for dashboard:', error)
  }

  // Compute date range boundaries (start of day in local time)
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Sunday of current week

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  // Helper to compute stats for a date range
  function computeStats(startDate: Date) {
    const startISO = startDate.toISOString()
    const filtered = orders.filter((o) => o.created_at >= startISO)
    return {
      count: filtered.length,
      totalSales: filtered.reduce((sum, o) => sum + (o.total ?? 0), 0),
    }
  }

  const stats = {
    today: computeStats(today),
    week: computeStats(weekStart),
    month: computeStats(monthStart),
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">
          Dashboard
        </h1>
        <p className="text-stone-400 text-sm">
          Welcome back — here&apos;s your store overview.
        </p>
      </div>

      <StatsPanel stats={stats} />

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Orders
        </h2>
        <RecentOrdersTable orders={orders.slice(0, 10)} />
      </div>
    </div>
  )
}
