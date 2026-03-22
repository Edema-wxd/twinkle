'use client'

import { useState } from 'react'
import { Product, ProductMaterial } from '@/lib/types/product'
import { ProductImageGallery } from './ProductImageGallery'

interface ProductDetailClientProps {
  product: Product
}

const MATERIAL_BADGE: Record<ProductMaterial, string> = {
  Gold: 'bg-gold/20 text-cocoa',
  Silver: 'bg-stone text-charcoal',
  Crystal: 'bg-cream border border-charcoal/20 text-charcoal',
  Tools: 'bg-forest/20 text-forest',
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants.find((v) => v.in_stock)?.id ?? product.variants[0]?.id ?? ''
  )
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const galleryImages = product.images?.length ? product.images : [product.image]
  const badgeClasses = MATERIAL_BADGE[product.material]

  return (
    <>
      {/* Left column: Gallery */}
      <ProductImageGallery images={galleryImages} alt={product.name} />

      {/* Right column: Product info + interactive controls */}
      <div>
        {/* Material badge */}
        <span
          className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full mb-4 ${badgeClasses}`}
        >
          {product.material}
        </span>

        {/* Product name */}
        <h1 className="font-display text-3xl md:text-4xl text-cocoa mb-2">
          {product.name}
        </h1>

        {/* Price — updates on variant selection */}
        <p className="font-heading text-2xl text-gold mb-6">
          ₦{(selectedVariant?.price ?? product.price_min).toLocaleString()}
        </p>

        {/* Description */}
        <p className="font-body text-charcoal/80 leading-relaxed mb-8">
          {product.description}
        </p>

        {/* Size picker */}
        <div className="mb-6">
          <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  if (variant.in_stock) setSelectedVariantId(variant.id)
                }}
                disabled={!variant.in_stock}
                className={`rounded-lg px-4 py-2 font-body text-sm border-2 transition-all ${
                  !variant.in_stock
                    ? 'opacity-40 cursor-not-allowed border-charcoal/10 text-charcoal/40'
                    : selectedVariantId === variant.id
                    ? 'border-gold bg-gold/10 text-cocoa font-semibold'
                    : 'border-charcoal/20 text-charcoal hover:border-gold'
                }`}
              >
                {variant.name}
                {!variant.in_stock && (
                  <span className="block text-xs font-normal">(Out of stock)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity stepper */}
        <div className="mb-6">
          <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide">
            Quantity
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className={`w-10 h-10 rounded-lg border-2 border-charcoal/20 font-body text-lg flex items-center justify-center transition-all hover:border-gold ${
                quantity === 1 ? 'opacity-40' : ''
              }`}
            >
              −
            </button>
            <span className="w-12 text-center font-body text-lg">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              aria-label="Increase quantity"
              className={`w-10 h-10 rounded-lg border-2 border-charcoal/20 font-body text-lg flex items-center justify-center transition-all hover:border-gold ${
                quantity === 10 ? 'opacity-40' : ''
              }`}
            >
              +
            </button>
          </div>
        </div>

        {/* Thread colour swatches — decorative placeholder, not shown for Tools (e.g. Shears) */}
        {/* TODO Phase 5: wire thread colour to cart line item */}
        {product.material !== 'Tools' && (
          <div className="mb-8">
            <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide">
              Thread Colour
            </p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A]" title="Black" />
              <div className="w-8 h-8 rounded-full bg-gold" title="Gold" />
              <div className="w-8 h-8 rounded-full bg-terracotta" title="Red" />
              <div className="w-8 h-8 rounded-full bg-cream border border-charcoal/20" title="White" />
              <div className="w-8 h-8 rounded-full bg-forest" title="Forest" />
            </div>
            <p className="text-xs text-charcoal/50 mt-2 font-body">
              Colour selection coming soon
            </p>
          </div>
        )}

        {/* Add to Cart button — Phase 5 no-op */}
        <button
          onClick={() => {
            /* TODO Phase 5: wire to cart context */
          }}
          className="w-full bg-gold text-cocoa font-heading font-semibold py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors mt-8"
        >
          Add to Cart
        </button>
      </div>
    </>
  )
}
