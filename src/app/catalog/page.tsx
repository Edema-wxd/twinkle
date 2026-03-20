// TODO (Phase 3 Plan 04): swap mock import for Supabase query
import { CATALOG_PRODUCTS } from '@/lib/mock/products'
import { CatalogClient } from '@/components/catalog/CatalogClient'

export const metadata = {
  title: 'Shop Loc Beads — Twinkle Locs',
  description:
    'Browse all premium loc bead accessories handcrafted in Nigeria. Filter by material, sort by price, and find your perfect style.',
}

export default function CatalogPage() {
  return <CatalogClient products={CATALOG_PRODUCTS} />
}
