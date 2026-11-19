import type { Metadata } from 'next'
import { db, products as productsTable } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { CatalogClient } from '@/components/catalog/CatalogClient'
import { applyStockToProducts } from '@/lib/stock'
import { formatNaira, getShippingInfo } from '@/lib/checkout/shippingInfo'
import { lowestFromPrice, naira, priceRangeText } from '@/components/product/storeCopy'

// The homepage is the shop. /catalog redirects here (next.config.ts); product pages stay at /catalog/<slug>.
// Refreshed when products, stock or shipping change (revalidatePath('/')), and at least every 10 minutes.
export const revalidate = 600

/** Cheapest pack of beads on sale right now (shears and other tools left out), or null if it can't be read */
async function beadsFrom(): Promise<number | null> {
  try {
    const rows = await db
      .select({ priceMin: productsTable.priceMin, material: productsTable.material, variants: productsTable.variants })
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
    return lowestFromPrice(
      rows
        .filter((r) => r.material !== 'Tools')
        .map((r) => ({ price_min: r.priceMin, variants: r.variants as unknown as ProductVariant[] })),
    )
  } catch (err) {
    console.error('[home] Failed to work out the lowest bead price for the meta description:', err)
    return null
  }
}

// Shipping figures come from the same settings checkout charges from; the "from" price from live products
export async function generateMetadata(): Promise<Metadata> {
  const [info, from] = await Promise.all([getShippingInfo(), beadsFrom()])
  const title = 'Loc Beads Nigeria - Gold, Silver & Crystal | Twinkle Locs'
  const description = `Buy handcrafted loc beads online in Nigeria. Gold, silver and crystal styles${from ? ` from ${naira(from)}` : ''}. Lagos delivery from ${formatNaira(info.lagosFrom)}, same day in most areas; nationwide in ${info.otherDays}.`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Twinkle Locs – Nigerian Loc Beads' }],
      type: 'website',
    },
  }
}

// priceRange is text for people ("₦3,500 - ₦103,000"), worked out from the live products
const storeJsonLd = (priceRange: string | null) => ({
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Twinkle Locs',
  description:
    'Handcrafted loc bead accessories made in Nigeria. Gold, silver and crystal loc beads in multiple sizes for loc wearers.',
  url: 'https://twinklelocs.com',
  logo: 'https://twinklelocs.com/images/Logo.png',
  image: 'https://twinklelocs.com/og-image.jpg',
  telephone: '+2349118888010',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lagos',
    addressCountry: 'NG',
  },
  ...(priceRange && { priceRange }),
  currenciesAccepted: 'NGN',
  paymentAccepted: 'Bank Transfer, Card, WhatsApp Order',
  areaServed: [{ '@type': 'Country', name: 'Nigeria' }],
  founder: { '@type': 'Person', name: 'Unoma' },
  sameAs: ['https://www.instagram.com/twinklelocs', 'https://wa.me/2349118888010'],
})

export default async function HomePage() {
  const productsData = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true))
    .orderBy(desc(productsTable.createdAt))

  const mapped: Product[] = productsData.map((row) => ({
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
  }))

  // Live stock counts: sizes sell out automatically when their last pack goes
  const products = await applyStockToProducts(mapped)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(priceRangeText(products))).replace(/</g, '\\u003c') }} />
      <CatalogClient products={products} />
    </>
  )
}
