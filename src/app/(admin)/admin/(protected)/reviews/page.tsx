import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewForm } from '../../../_components/ReviewForm'

export const metadata = {
  title: 'Add Review — Twinkle Locs Admin',
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

  // Fetch all active products for the product picker
  const adminClient = createAdminClient()
  const { data: productsData, error } = await adminClient
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch products for review form:', error)
  }

  const products = productsData ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Add Review</h1>
        <p className="text-stone-400 text-sm mt-1">
          Add a customer review to a product. It will appear immediately on the storefront.
        </p>
      </div>

      <ReviewForm products={products} />
    </div>
  )
}
