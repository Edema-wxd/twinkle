import { createClient } from '@/lib/supabase/server'
import { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { CatalogClient } from '@/components/catalog/CatalogClient'

export const metadata = {
  title: 'Shop Loc Beads — Twinkle Locs',
  description:
    'Browse all premium loc bead accessories handcrafted in Nigeria. Filter by material, sort by price, and find your perfect style.',
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
