'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/types/product'
import { useCart } from '@/lib/cart/CartContext'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'

interface AddToCartModalProps {
  product: Product
  onClose: () => void
}

export function AddToCartModal({ product, onClose }: AddToCartModalProps) {
  const { dispatch } = useCart()
  const isTool = product.material === 'Tools'

  const initialVariant = product.variants.find((v) => v.in_stock) ?? product.variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? '')
  const [selectedTierQty, setSelectedTierQty] = useState(
    initialVariant?.price_tiers[0]?.qty ?? 0
  )
  const [selectedThreadColour, setSelectedThreadColour] = useState<string | null>(
    isTool ? '' : null
  )

  const overlayRef = useRef<HTMLDivElement>(null)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedTier = selectedVariant?.price_tiers.find((t) => t.qty === selectedTierQty)
  const displayPrice = selectedTier?.price ?? selectedVariant?.price ?? product.price_min

  const canAddToCart = isTool || selectedThreadColour !== null

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId)
    const newVariant = product.variants.find((v) => v.id === variantId)
    setSelectedTierQty(newVariant?.price_tiers[0]?.qty ?? 0)
    setSelectedThreadColour(isTool ? '' : null)
  }

  function handleAddToCart() {
    if (!canAddToCart) return
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        variantId: selectedVariantId,
        tierQty: selectedTierQty,
        threadColour: isTool ? '' : selectedThreadColour!,
        productName: product.name,
        variantName: selectedVariant?.name ?? '',
        unitPrice: displayPrice,
        imageUrl: product.image,
        isTool,
        quantity: 1,
      },
    })
    onClose()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Select size for ${product.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-cream rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-heading font-semibold text-cocoa text-lg">
            Select size — {product.name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal/50 hover:text-charcoal transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="font-body text-sm text-charcoal/60 mb-4">{product.name}</p>

        {/* Size selection */}
        <div>
          <p className="font-heading font-semibold text-cocoa text-sm mb-3">Size:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => { if (variant.in_stock) handleVariantChange(variant.id) }}
                disabled={!variant.in_stock}
                className={`rounded-lg px-4 py-2 font-body text-sm transition-all ${
                  selectedVariantId === variant.id
                    ? 'border-2 border-gold bg-gold/10 text-cocoa'
                    : 'border-2 border-stone bg-stone text-charcoal hover:border-gold/50'
                } ${!variant.in_stock ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {variant.name}
                {!variant.in_stock && (
                  <span className="block text-xs">(Out of stock)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pack size / tier selection */}
        {(selectedVariant?.price_tiers.length ?? 0) > 1 && (
          <div className="mb-4">
            <p className="font-heading font-semibold text-cocoa text-sm mb-3">Pack size:</p>
            <div className="flex flex-wrap gap-2">
              {selectedVariant!.price_tiers.map((tier) => (
                <button
                  key={tier.qty}
                  onClick={() => setSelectedTierQty(tier.qty)}
                  className={`rounded-lg px-4 py-2 font-body text-sm transition-all ${
                    selectedTierQty === tier.qty
                      ? 'border-2 border-gold bg-gold/10 text-cocoa'
                      : 'border-2 border-stone bg-stone text-charcoal hover:border-gold/50'
                  }`}
                >
                  {tier.qty} beads — ₦{tier.price.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thread colour selection (non-Tools only) */}
        {!isTool && (
          <div className="mb-6">
            <p className="font-heading font-semibold text-cocoa text-sm mb-3">Thread colour:</p>
            <div className="flex flex-wrap gap-2">
              {THREAD_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  onClick={() => setSelectedThreadColour(colour.id)}
                  title={colour.label}
                  aria-label={colour.label}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedThreadColour === colour.id
                      ? 'border-gold scale-110'
                      : 'border-transparent hover:border-gold/50'
                  }`}
                  style={{ backgroundColor: colour.hex }}
                />
              ))}
            </div>
            {selectedThreadColour === null && (
              <p className="text-xs text-terracotta mt-2 font-body">Please select a thread colour</p>
            )}
          </div>
        )}

        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={`w-full font-heading font-semibold py-3 rounded-lg transition-colors ${
            canAddToCart
              ? 'bg-gold text-cocoa hover:bg-terracotta hover:text-cream'
              : 'bg-stone text-charcoal/40 cursor-not-allowed'
          }`}
        >
          Add to cart — ₦{displayPrice.toLocaleString()}
        </button>
      </div>
    </div>
  )
}
