import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { orders, blogPosts, faqs } from '@/db'
import { desc, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Order } from '@/types/db'
import StatsPanel from '../../_components/StatsPanel'
import RecentOrdersTable from '../../_components/RecentOrdersTable'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminDashboardPage() {
  await requireAdminSession()

  // Fetch all orders ordered by most recent first
  let ordersData: Order[] = []
  try {
    const rows = await db
      .select({
        id: orders.id,
        created_at: orders.createdAt,
        status: orders.status,
        customer_name: orders.customerName,
        total: orders.total,
        paystack_reference: orders.paystackReference,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))

    ordersData = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at as string,
      paystack_reference: r.paystack_reference,
      paystack_payload: null,
      status: r.status,
      customer_name: r.customer_name,
      customer_email: '',
      customer_phone: '',
      customer_ip: null,
      delivery_address: '',
      delivery_state: '',
      shipping_cost: 0,
      subtotal: 0,
      total: r.total,
      tracking_number: null,
    }))
  } catch (error) {
    console.error('Failed to fetch orders for dashboard:', error)
  }

  // Content health — keeps promotion on the owner's radar
  let content = { live: 0, drafts: 0, lastPublished: null as Date | null, faqCount: 0, featuredFaqs: 0 }
  try {
    const [[postStats], [faqStats]] = await Promise.all([
      db
        .select({
          live: sql<number>`count(*) filter (where ${blogPosts.published})`.mapWith(Number),
          drafts: sql<number>`count(*) filter (where not ${blogPosts.published})`.mapWith(Number),
          lastPublished: sql<string | null>`max(${blogPosts.publishedAt})`,
        })
        .from(blogPosts),
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          featured: sql<number>`count(*) filter (where ${faqs.isFeatured})`.mapWith(Number),
        })
        .from(faqs),
    ])
    content = {
      live: postStats?.live ?? 0,
      drafts: postStats?.drafts ?? 0,
      lastPublished: postStats?.lastPublished ? new Date(postStats.lastPublished) : null,
      faqCount: faqStats?.total ?? 0,
      featuredFaqs: faqStats?.featured ?? 0,
    }
  } catch (error) {
    console.error('Failed to fetch content stats for dashboard:', error)
  }
  const daysSincePost = content.lastPublished
    ? Math.floor((Date.now() - content.lastPublished.getTime()) / 86_400_000)
    : null

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
    const filtered = ordersData.filter((o) => o.created_at >= startISO)
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

      <section aria-labelledby="content-health" className="rounded-xl bg-stone-900 ring-1 ring-stone-800 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="content-health" className="text-lg font-semibold text-white">Content &amp; promotion</h2>
            <p className="text-sm text-stone-400 mt-1">
              {daysSincePost === null
                ? 'No posts published yet. A first guide gives Instagram and WhatsApp something to link to.'
                : daysSincePost > 14
                  ? `Last post was ${daysSincePost} days ago. A fresh story keeps Google and your followers coming back.`
                  : `Last post ${daysSincePost === 0 ? 'today' : `${daysSincePost} day${daysSincePost === 1 ? '' : 's'} ago`}. Nice rhythm.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/blog/new" className="px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg transition-colors">Write a post</Link>
            <Link href="/admin/faqs" className="px-4 py-2 ring-1 ring-stone-600 hover:ring-stone-400 text-stone-200 text-sm font-medium rounded-lg transition-colors">Add an FAQ</Link>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Live posts', value: content.live, href: '/admin/blog?status=live' },
            { label: 'Drafts waiting', value: content.drafts, href: '/admin/blog?status=draft' },
            { label: 'FAQs', value: content.faqCount, href: '/admin/faqs' },
            { label: 'FAQs on home page', value: content.featuredFaqs, href: '/admin/faqs' },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="rounded-lg bg-stone-950/60 ring-1 ring-stone-800 hover:ring-stone-600 p-3 transition-colors">
              <dt className="text-xs text-stone-400">{s.label}</dt>
              <dd className="text-xl font-bold text-white tabular-nums mt-0.5">{s.value}</dd>
            </Link>
          ))}
        </dl>
      </section>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Orders
        </h2>
        <RecentOrdersTable orders={ordersData.slice(0, 10)} />
      </div>
    </div>
  )
}
