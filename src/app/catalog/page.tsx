import type { Metadata } from 'next'
import { db, products as productsTable } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { CatalogClient } from '@/components/catalog/CatalogClient'

export const metadata: Metadata = {
  title: { absolute: 'Buy Loc Beads Online in Nigeria | Twinkle Locs' },
  description: 'Shop the full Twinkle Locs collection. Loc beads in gold, silver, crystal, and onyx. Packs of 50 to 200 beads, sizes 2mm to 6mm. Order online or via WhatsApp.',
  openGraph: {
    title: 'Buy Loc Beads Online in Nigeria | Twinkle Locs',
    description: 'Shop the full Twinkle Locs collection. Loc beads in gold, silver, crystal, and onyx. Packs of 50 to 200 beads, sizes 2mm to 6mm. Order online or via WhatsApp.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

export default async function CatalogPage() {
  const productsData = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true))
    .orderBy(desc(productsTable.createdAt))

  const products: Product[] = productsData.map((row) => ({
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

  return <CatalogClient products={products} />
}
