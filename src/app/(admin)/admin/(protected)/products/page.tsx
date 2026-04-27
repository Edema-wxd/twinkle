import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { products } from '@/db'
import { desc } from 'drizzle-orm'
import { ProductListTable } from '../../../_components/ProductListTable'

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
  let productsData: {
    id: string
    name: string
    slug: string
    material: string
    is_active: boolean
    is_featured: boolean
    price_min: number
    price_max: number
    created_at: string
  }[] = []

  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        material: products.material,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        priceMin: products.priceMin,
        priceMax: products.priceMax,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt))

    productsData = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      material: r.material,
      is_active: r.isActive,
      is_featured: r.isFeatured,
      price_min: r.priceMin,
      price_max: r.priceMax,
      created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))
  } catch (error) {
    console.error('Failed to fetch products for admin:', error)
  }

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
          className="px-4 py-2 bg-gold hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + New product
        </Link>
      </div>

      <ProductListTable products={productsData} />
    </div>
  )
}
