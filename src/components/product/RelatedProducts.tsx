import { Product } from '@/lib/types/product'
import { CatalogProductCard } from '@/components/catalog/CatalogProductCard'

interface RelatedProductsProps {
  products: Product[]
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <h2 className="font-display text-2xl text-cocoa mb-2">You might also like</h2>
      <p className="font-body text-charcoal/70 mb-6">
        More bead styles to complete your look.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <CatalogProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
