import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params

  const supabase = await createClient()
  const result = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (result.error || !result.data) return notFound()

  const row = result.data
  const product: Product = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    material: row.material as ProductMaterial,
    is_featured: row.is_featured,
    variants: row.variants as unknown as ProductVariant[],
    price_min: row.price_min,
    price_max: row.price_max,
    created_at: row.created_at,
    images: row.images?.length ? row.images : undefined,
  }

  return (
    <main className="bg-cream min-h-screen">
      {/* Breadcrumb */}
      <nav className="max-w-6xl mx-auto px-4 pt-6 pb-0">
        <Link
          href="/catalog"
          className="text-gold hover:underline font-body text-sm"
        >
          Catalog
        </Link>
        <span className="text-charcoal/40 mx-1">›</span>
        <span className="font-body text-sm text-charcoal/70">{product.name}</span>
      </nav>

      {/* Main content grid — ProductDetailClient renders two children: gallery + info */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        <ProductDetailClient product={product} />
      </div>
    </main>
  )
}
