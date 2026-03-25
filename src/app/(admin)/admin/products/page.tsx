import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductListTable } from '../../_components/ProductListTable'

export const metadata = {
  title: 'Products — Twinkle Locs Admin',
}

export default async function AdminProductsPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Fetch all products — NOT filtered by is_active (admin sees everything)
  const adminClient = createAdminClient()
  const { data: productsData, error } = await adminClient
    .from('products')
    .select('id, name, slug, material, is_active, is_featured, price_min, price_max, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch products for admin:', error)
  }

  const products = productsData ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Products
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Manage your product catalogue.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + New product
        </Link>
      </div>

      <ProductListTable products={products} />
    </div>
  )
}
