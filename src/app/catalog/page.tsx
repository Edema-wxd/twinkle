import type { Metadata } from 'next'
import { db, products as productsTable } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { CatalogClient } from '@/components/catalog/CatalogClient'

export const metadata: Metadata = {
  title: 'Shop Loc Beads',
  description: 'Browse our full collection of Nigerian loc beads — gold, silver, crystal, and onyx styles in multiple sizes. Filter by material and sort by price.',
  openGraph: {
    title: 'Shop Loc Beads | Twinkle Locs',
    description: 'Browse Nigerian loc beads in gold, silver, crystal, and onyx. Multiple sizes available.',
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
