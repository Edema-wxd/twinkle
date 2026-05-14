import { Product } from '@/lib/types/product'
import { CatalogProductCard } from '@/components/catalog/CatalogProductCard'

interface UpsellBlockProps {
  shears: Product
}

export function UpsellBlock({ shears }: UpsellBlockProps) {
  return (
    <section className="bg-white rounded-2xl p-8">
      <h2 className="font-display text-2xl text-forest mb-2">
        Complete Your Starter Kit
      </h2>
      <p className="font-body text-charcoal/70 mb-6">
        Pair your beads with professional loc shears for a complete styling toolkit.
      </p>
      <div className="max-w-xs">
        <CatalogProductCard product={shears} />
      </div>
    </section>
  )
}
