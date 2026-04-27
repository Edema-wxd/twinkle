import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { reviews, products } from '@/db'
import { desc, asc, eq } from 'drizzle-orm'
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

  const [reviewRows, productRows] = await Promise.all([
    db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        authorName: reviews.authorName,
        body: reviews.body,
        rating: reviews.rating,
        createdAt: reviews.createdAt,
        productName: products.name,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt))
      .catch((e) => { console.error('Failed to fetch reviews:', e); return [] }),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(asc(products.name))
      .catch((e) => { console.error('Failed to fetch products:', e); return [] }),
  ])

  const reviewsList: ReviewRow[] = reviewRows.map((r) => ({
    id: r.id,
    product_id: r.productId,
    product_name: r.productName ?? 'Unknown product',
    author_name: r.authorName,
    body: r.body,
    rating: r.rating,
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }))

  const productOptions = productRows.map((p) => ({ id: p.id, name: p.name }))

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
          <span className="ml-2 text-sm font-normal text-stone-500">({reviewsList.length})</span>
        </h2>
        <ReviewsTable reviews={reviewsList} />
      </section>

      <section className="space-y-4 border-t border-stone-700 pt-8">
        <h2 className="text-base font-semibold text-white">Add a review</h2>
        <div className="max-w-2xl">
          <ReviewForm products={productOptions} />
        </div>
      </section>
    </div>
  )
}
