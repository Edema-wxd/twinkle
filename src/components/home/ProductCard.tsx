import Image from 'next/image'
import { MockProduct } from '@/lib/mock/products'

interface ProductCardProps {
  product: MockProduct
  onAddToCart: () => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
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
        <h3 className="font-heading font-semibold text-cocoa mb-1 text-base">
          {product.name}
        </h3>
        <p className="font-body text-sm text-charcoal/60 mb-3">
          ₦{product.price_min.toLocaleString()} – ₦{product.price_max.toLocaleString()}
        </p>
        <button
          onClick={onAddToCart}
          className="w-full bg-gold text-cocoa font-heading font-semibold py-2.5 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
