'use client'

import { useState } from 'react'
import { Product, ProductMaterial } from '@/lib/types/product'
import { ProductImageGallery } from './ProductImageGallery'
import { useCart } from '@/lib/cart/CartContext'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'

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
  const { dispatch } = useCart()

  const initialVariant = product.variants.find((v) => v.in_stock) ?? product.variants[0]

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? '')
  const [selectedTierQty, setSelectedTierQty] = useState(
    initialVariant?.price_tiers[0]?.qty ?? 0
  )
  const [selectedThreadColour, setSelectedThreadColour] = useState<string | null>(
    product.material === 'Tools' ? '' : null
  )

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedTier = selectedVariant?.price_tiers.find((t) => t.qty === selectedTierQty)
  const displayPrice = selectedTier?.price ?? selectedVariant?.price ?? product.price_min

  const galleryImages = product.images?.length ? product.images : [product.image]
  const badgeClasses = MATERIAL_BADGE[product.material]

  const hasMultipleTiers = (selectedVariant?.price_tiers.length ?? 0) > 1

  const canAddToCart = product.material === 'Tools' || selectedThreadColour !== null

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId)
    const newVariant = product.variants.find((v) => v.id === variantId)
    setSelectedTierQty(newVariant?.price_tiers[0]?.qty ?? 0)
    setSelectedThreadColour(product.material === 'Tools' ? '' : null)
  }

  function handleAddToCart() {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        variantId: selectedVariantId,
        tierQty: selectedTierQty,
        threadColour: product.material === 'Tools' ? '' : selectedThreadColour!,
        productName: product.name,
        variantName: selectedVariant?.name ?? '',
        unitPrice: displayPrice,
        imageUrl: product.image,
        isTool: product.material === 'Tools',
        quantity: 1,
      },
    })
  }

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

        {/* Price — updates on variant + tier selection */}
        <p className="font-heading text-2xl text-gold mb-1">
          ₦{displayPrice.toLocaleString()}
        </p>

        {/* Pack label — hidden for single-tier products (e.g. Shears) */}
        {hasMultipleTiers && (
          <p className="font-body text-sm text-charcoal/60 mb-5">
            Pack of {selectedTierQty} beads
          </p>
        )}
        {!hasMultipleTiers && <div className="mb-5" />}

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
                  if (variant.in_stock) handleVariantChange(variant.id)
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

        {/* Pack-size picker — only shown when variant has more than 1 tier */}
        {hasMultipleTiers && selectedVariant && (
          <div className="mb-6">
            <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide">
              Pack Size
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedVariant.price_tiers.map((tier) => (
                <button
                  key={tier.qty}
                  onClick={() => setSelectedTierQty(tier.qty)}
                  className={`rounded-lg px-4 py-2 font-body text-sm border-2 transition-all ${
                    selectedTierQty === tier.qty
                      ? 'border-gold bg-gold/10 text-cocoa font-semibold'
                      : 'border-charcoal/20 text-charcoal hover:border-gold'
                  }`}
                >
                  {tier.qty} beads
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thread colour picker — interactive, not shown for Tools (e.g. Shears) */}
        {product.material !== 'Tools' && (
          <div className="mb-8">
            <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide flex items-center gap-2">
              Thread Colour
              {selectedThreadColour === null && (
                <span className="text-xs font-body font-normal text-terracotta bg-terracotta/10 px-2 py-0.5 rounded-full normal-case tracking-normal">
                  Required
                </span>
              )}
            </p>
            <div className="flex gap-2">
              {THREAD_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  onClick={() => setSelectedThreadColour(colour.id)}
                  title={colour.label}
                  aria-label={colour.label}
                  aria-pressed={selectedThreadColour === colour.id}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedThreadColour === colour.id
                      ? 'border-cocoa scale-110'
                      : 'border-transparent hover:border-charcoal/40'
                  }`}
                  style={{ backgroundColor: colour.hex }}
                />
              ))}
            </div>
            {selectedThreadColour !== null && (
              <p className="text-xs text-charcoal/60 mt-2 font-body">
                {THREAD_COLOURS.find((c) => c.id === selectedThreadColour)?.label}
              </p>
            )}
          </div>
        )}

        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={`w-full font-heading font-semibold py-4 rounded-lg transition-colors mt-8 ${
            canAddToCart
              ? 'bg-gold text-cocoa hover:bg-terracotta hover:text-cream'
              : 'bg-charcoal/20 text-charcoal/40 cursor-not-allowed'
          }`}
        >
          {canAddToCart ? 'Add to Cart' : 'Select Thread Colour'}
        </button>
      </div>
    </>
  )
}
