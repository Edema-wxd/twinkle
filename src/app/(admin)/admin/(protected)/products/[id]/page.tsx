import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { products } from '@/db'
import { eq } from 'drizzle-orm'
import { ProductForm } from '../../../../_components/ProductForm'

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
    variants: row.variants,
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
