import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()

  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const products: Product[] = (productsData ?? []).map((row) => ({
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
  }))

  return <CatalogClient products={products} />
}
