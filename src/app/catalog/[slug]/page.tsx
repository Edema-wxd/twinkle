import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { Review } from '@/lib/types/review'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'
import { ProductReviews } from '@/components/product/ProductReviews'
import { UpsellBlock } from '@/components/product/UpsellBlock'

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

  // Fetch reviews for this product
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })

  const reviews = (reviewsData ?? []) as Review[]

  // Fetch shears for upsell — only when viewing a non-Tools product
  let shearsProduct: Product | null = null
  if (product.material !== 'Tools') {
    const { data: shearsData } = await supabase
      .from('products')
      .select('*')
      .eq('slug', 'shears')
      .single()

    if (shearsData) {
      shearsProduct = {
        id: shearsData.id,
        name: shearsData.name,
        slug: shearsData.slug,
        description: shearsData.description,
        image: shearsData.image,
        material: shearsData.material as ProductMaterial,
        is_featured: shearsData.is_featured,
        variants: shearsData.variants as unknown as ProductVariant[],
        price_min: shearsData.price_min,
        price_max: shearsData.price_max,
        created_at: shearsData.created_at,
        images: shearsData.images?.length ? shearsData.images : undefined,
      }
    }
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

      {/* Reviews section */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <ProductReviews reviews={reviews} />
      </section>

      {/* Upsell block — only for non-Tools products */}
      {shearsProduct && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <UpsellBlock shears={shearsProduct} />
        </section>
      )}
    </main>
  )
}
