import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { products } from '@/db'
import { eq } from 'drizzle-orm'
import { ProductForm } from '../../../../_components/ProductForm'
import { getStockMap } from '@/lib/stock'

export const metadata = {
  title: 'Edit Product — Twinkle Locs Admin',
}

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  const { id } = await params

  // Fetch product by ID using Drizzle
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  if (!row) {
    notFound()
  }

  // Stock lives in its own table; the form gets the current count and remembers it
  // (stock_loaded) so saving only changes counts the admin actually edited
  const stockMap = await getStockMap([row.id])
  const variantsWithStock = (Array.isArray(row.variants) ? row.variants : []).map((v: { id?: string }) => {
    const units = v.id ? stockMap.get(`${row.id}:${v.id}`) : undefined
    return { ...v, stock: units ?? null, stock_loaded: units ?? null }
  })

  // Map camelCase Drizzle row to snake_case shape expected by ProductForm
  const product = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    material: row.material,
    is_featured: row.isFeatured,
    is_active: row.isActive,
    price_min: row.priceMin,
    price_max: row.priceMax,
    image: row.image,
    images: row.images,
    variants: variantsWithStock,
    seo_description: row.seoDescription ?? null,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Edit product</h1>
        <p className="text-stone-400 text-sm mt-1">
          Update the product details below.
        </p>
      </div>

      <ProductForm product={product} />
    </div>
  )
}
