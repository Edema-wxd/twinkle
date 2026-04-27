import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db, products as productsTable, reviews as reviewsTable } from '@/db'
import { eq, desc, ne, and } from 'drizzle-orm'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { Review } from '@/lib/types/review'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'
import { ProductReviews } from '@/components/product/ProductReviews'
import { UpsellBlock } from '@/components/product/UpsellBlock'
import { RelatedProducts } from '@/components/product/RelatedProducts'

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  const [row] = await db
    .select({
      name: productsTable.name,
      description: productsTable.description,
      seoDescription: productsTable.seoDescription,
      image: productsTable.image,
      images: productsTable.images,
      slug: productsTable.slug,
    })
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1)

  if (!row) return {}

  const description = (row.seoDescription ?? row.description).slice(0, 155)
  const ogImage = (row.images && row.images.length > 0 ? row.images[0] : null) ?? row.image

  return {
    title: row.name,
    description,
    openGraph: {
      title: row.name,
      description,
      images: ogImage ? [{ url: ogImage }] : [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    alternates: {
      canonical: `/catalog/${row.slug}`,
    },
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1)

  if (!row) return notFound()

  const product: Product = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    material: row.material as ProductMaterial,
    is_featured: row.isFeatured,
    variants: row.variants as unknown as ProductVariant[],
    price_min: row.priceMin,
    price_max: row.priceMax,
    created_at: row.createdAt.toISOString(),
    images: row.images?.length ? row.images : undefined,
  }

  // Fetch reviews for this product
  const reviewsData = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.productId, product.id))
    .orderBy(desc(reviewsTable.createdAt))

  const reviews: Review[] = reviewsData.map((r) => ({
    id: r.id,
    product_id: r.productId,
    author_name: r.authorName,
    body: r.body,
    rating: r.rating,
    created_at: r.createdAt.toISOString(),
  }))

  // Build JSON-LD structured data
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images && product.images.length > 0 ? product.images[0] : product.image,
    brand: {
      '@type': 'Brand',
      name: 'Twinkle Locs',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: product.price_min,
      availability: product.variants.some((v) => v.in_stock)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${BASE}/catalog/${product.slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Twinkle Locs',
      },
    },
    ...(reviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length).toFixed(1),
        reviewCount: reviews.length,
      },
    }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${BASE}/catalog` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${BASE}/catalog/${product.slug}` },
    ],
  }

  // Fetch shears for upsell — only when viewing a non-Tools product
  let shearsProduct: Product | null = null
  if (product.material !== 'Tools') {
    const [shearsData] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, 'shears'))
      .limit(1)

    if (shearsData) {
      shearsProduct = {
        id: shearsData.id,
        name: shearsData.name,
        slug: shearsData.slug,
        description: shearsData.description,
        image: shearsData.image,
        material: shearsData.material as ProductMaterial,
        is_featured: shearsData.isFeatured,
        variants: shearsData.variants as unknown as ProductVariant[],
        price_min: shearsData.priceMin,
        price_max: shearsData.priceMax,
        created_at: shearsData.createdAt.toISOString(),
        images: shearsData.images?.length ? shearsData.images : undefined,
      }
    }
  }

  // Fetch related products — exclude current product and shears (handled separately)
  const relatedData = await db
    .select()
    .from(productsTable)
    .where(
      and(
        ne(productsTable.slug, slug),
        ne(productsTable.slug, 'shears'),
        ne(productsTable.material, 'Tools'),
      )
    )
    .orderBy(desc(productsTable.isFeatured))
    .limit(4)

  const relatedProducts: Product[] = relatedData.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    image: r.image,
    material: r.material as ProductMaterial,
    is_featured: r.isFeatured,
    variants: r.variants as unknown as ProductVariant[],
    price_min: r.priceMin,
    price_max: r.priceMax,
    created_at: r.createdAt.toISOString(),
    images: r.images?.length ? r.images : undefined,
  }))

  return (
    <main className="bg-cream min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
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

      {/* Related products */}
      <RelatedProducts products={relatedProducts} />

      {/* Upsell block — only for non-Tools products */}
      {shearsProduct && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <UpsellBlock shears={shearsProduct} />
        </section>
      )}
    </main>
  )
}
