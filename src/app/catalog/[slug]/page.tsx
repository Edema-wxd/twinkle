import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { ProductImageGallery } from '@/components/product/ProductImageGallery'

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

const MATERIAL_BADGE: Record<ProductMaterial, string> = {
  Gold: 'bg-gold/20 text-cocoa',
  Silver: 'bg-stone border border-charcoal/20 text-charcoal',
  Crystal: 'bg-cream border border-charcoal/20 text-charcoal',
  Tools: 'bg-forest/20 text-forest',
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

  const galleryImages = product.images ?? [product.image]
  const badgeClasses = MATERIAL_BADGE[product.material]

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

      {/* Main content grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: Gallery */}
        <ProductImageGallery images={galleryImages} alt={product.name} />

        {/* Right: Product info — placeholder for ProductDetailClient */}
        <div>
          <span
            className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full mb-4 ${badgeClasses}`}
          >
            {product.material}
          </span>
          <h1 className="font-display text-3xl md:text-4xl text-cocoa mb-2">
            {product.name}
          </h1>
          <p className="font-heading text-2xl text-gold mb-4">
            {product.price_min === product.price_max
              ? `₦${product.price_min.toLocaleString()}`
              : `₦${product.price_min.toLocaleString()} – ₦${product.price_max.toLocaleString()}`}
          </p>
          <p className="font-body text-charcoal/80 leading-relaxed mb-8">
            {product.description}
          </p>
          {/* TODO Plan 04-03: replace this section with <ProductDetailClient product={product} /> */}
          <p className="font-body text-charcoal/50 text-sm italic">
            Variant picker coming in next plan
          </p>
        </div>
      </div>
    </main>
  )
}
