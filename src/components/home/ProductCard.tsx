import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/lib/types/product'

interface ProductCardProps {
  product: Product
  onAddToCart: () => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const soldOut = !product.variants.some((v) => v.in_stock)
  return (
    <article className="group relative bg-white rounded-xl overflow-hidden transition-shadow duration-200 hover:shadow-lg flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-heading font-semibold text-forest mb-1 text-sm sm:text-base leading-snug">
          {/* Stretched link: whole card opens the product; the button below sits above it */}
          <Link href={`/catalog/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:rounded-xl">
            {product.name}
          </Link>
        </h3>
        <p className="font-body text-sm text-charcoal/75 mb-3">
          {product.price_min === product.price_max ? '' : 'From '}&#8358;{product.price_min.toLocaleString()}
        </p>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={soldOut}
          className="relative z-10 mt-auto w-full min-h-11 bg-forest text-cream font-heading font-semibold py-2.5 rounded-lg hover:bg-forest/90 transition-colors text-sm disabled:bg-charcoal/10 disabled:text-charcoal/60 disabled:cursor-not-allowed"
        >
          {soldOut ? 'Sold out' : 'Quick add'}
        </button>
      </div>
    </article>
  )
}
