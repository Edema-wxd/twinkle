import Image from 'next/image'
import Link from 'next/link'
import { Product, ProductMaterial } from '@/lib/types/product'

interface CatalogProductCardProps {
  product: Product
}

const MATERIAL_COLOURS: Record<ProductMaterial, string> = {
  Gold: 'bg-gold/20 text-cocoa',
  Silver: 'bg-stone border border-charcoal/20 text-charcoal',
  Crystal: 'bg-forest/10 text-forest',
  Tools: 'bg-terracotta/10 text-terracotta',
}

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  const inStock = product.variants.some((v) => v.in_stock)
  const badgeClasses = MATERIAL_COLOURS[product.material]

  return (
    <Link href={`/catalog/${product.slug}`}>
      <article className="bg-stone rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer">
        <div className="relative aspect-square w-full">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <span
            className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full mb-2 ${badgeClasses}`}
          >
            {product.material}
          </span>
          <h3 className="font-heading font-semibold text-cocoa text-base mb-1">
            {product.name}
          </h3>
          <p className="font-body text-sm text-charcoal/60 mb-3">
            From &#8358;{product.price_min.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 font-body text-xs">
            {inStock ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-forest inline-block" />
                <span className="text-forest">In Stock</span>
              </>
            ) : (
              <span className="text-terracotta/80">Out of Stock</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
