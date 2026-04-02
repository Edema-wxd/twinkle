import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewForm } from '../../../_components/ReviewForm'
import { ReviewsTable, type ReviewRow } from '../../../_components/ReviewsTable'

export const metadata = {
  title: 'Reviews — Twinkle Locs Admin',
}

export default async function AdminReviewsPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const adminClient = createAdminClient()

  // Fetch reviews + product name in one query
  const [{ data: reviewsRaw }, { data: productsData }] = await Promise.all([
    adminClient
      .from('reviews')
      .select('id, product_id, author_name, body, rating, created_at, products(name)')
      .order('created_at', { ascending: false }),
    adminClient
      .from('products')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  const reviews: ReviewRow[] = (reviewsRaw ?? []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    product_name: (r as any).products?.name ?? 'Unknown product',
    author_name: r.author_name,
    body: r.body,
    rating: r.rating,
    created_at: r.created_at,
  }))

  const products = productsData ?? []

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Reviews</h1>
        <p className="text-stone-400 text-sm mt-1">
          Manage customer reviews. Changes appear immediately on the storefront.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">
          All reviews
          <span className="ml-2 text-sm font-normal text-stone-500">({reviews.length})</span>
        </h2>
        <ReviewsTable reviews={reviews} />
      </section>

      <section className="space-y-4 border-t border-stone-700 pt-8">
        <h2 className="text-base font-semibold text-white">Add a review</h2>
        <div className="max-w-2xl">
          <ReviewForm products={products} />
        </div>
      </section>
    </div>
  )
}
