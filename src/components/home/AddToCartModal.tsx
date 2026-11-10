'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/types/product'
import { useCart } from '@/lib/cart/CartContext'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'
import { firstFittingTier, lowStockLabel, packFits } from '@/lib/stockDisplay'
import { useDialogFocus } from '@/lib/useDialogFocus'

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
    firstFittingTier(initialVariant)
  )
  const [selectedThreadColour, setSelectedThreadColour] = useState<string | null>(
    isTool ? '' : null
  )

  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, true)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedTier = selectedVariant?.price_tiers.find((t) => t.qty === selectedTierQty)
  const displayPrice = selectedTier?.price ?? selectedVariant?.price ?? product.price_min

  const isSoldOut = !product.variants.some((v) => v.in_stock)
  const canAddToCart = packFits(selectedVariant, selectedTierQty) && (isTool || selectedThreadColour !== null)

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId)
    const newVariant = product.variants.find((v) => v.id === variantId)
    setSelectedTierQty(firstFittingTier(newVariant))
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-charcoal/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div ref={panelRef} className="bg-cream rounded-t-2xl sm:rounded-2xl p-6 max-w-sm w-full sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-4">
          <h2 className="font-heading font-semibold text-forest text-lg">
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-3 -mt-2 flex items-center justify-center rounded-full text-charcoal/60 hover:text-charcoal transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Size selection */}
        <div>
          <p className="font-heading font-semibold text-forest text-sm mb-3">Size:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selectedVariantId === variant.id}
                onClick={() => { if (variant.in_stock) handleVariantChange(variant.id) }}
                disabled={!variant.in_stock}
                className={`rounded-lg px-4 py-2 font-body text-sm transition-all ${
                  selectedVariantId === variant.id
                    ? 'border-2 border-gold bg-gold/10 text-forest'
                    : 'border-2 border-charcoal/15 bg-white text-charcoal hover:border-gold'
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
            <p className="font-heading font-semibold text-forest text-sm mb-3">Pack size:</p>
            <div className="flex flex-wrap gap-2">
              {selectedVariant!.price_tiers.map((tier) => (
                <button
                  key={tier.qty}
                  type="button"
                  aria-pressed={selectedTierQty === tier.qty}
                  disabled={!packFits(selectedVariant, tier.qty)}
                  title={packFits(selectedVariant, tier.qty) ? undefined : 'Not enough left for this pack size'}
                  onClick={() => setSelectedTierQty(tier.qty)}
                  className={`rounded-lg px-4 py-2 font-body text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through ${
                    selectedTierQty === tier.qty
                      ? 'border-2 border-gold bg-gold/10 text-forest'
                      : 'border-2 border-charcoal/15 bg-white text-charcoal hover:border-gold'
                  }`}
                >
                  {tier.qty} beads — ₦{tier.price.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {lowStockLabel(selectedVariant, isTool) && (
          <p role="status" className="mb-4 font-body text-xs font-medium text-amber-800">{lowStockLabel(selectedVariant, isTool)}</p>
        )}

        {/* Thread colour selection (non-Tools only) */}
        {!isTool && (
          <div className="mb-6">
            <p className="font-heading font-semibold text-forest text-sm mb-3">Thread colour:</p>
            <div className="flex flex-wrap gap-2">
              {THREAD_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  onClick={() => setSelectedThreadColour(colour.id)}
                  title={colour.label}
                  aria-label={colour.label}
                  aria-pressed={selectedThreadColour === colour.id}
                  className={`w-10 h-10 rounded-full border-2 ring-1 ring-charcoal/10 transition-all ${
                    selectedThreadColour === colour.id
                      ? 'border-gold scale-110'
                      : 'border-transparent hover:border-gold/50'
                  }`}
                  style={{ backgroundColor: colour.hex }}
                />
              ))}
            </div>

          </div>
        )}

        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={`w-full font-heading font-semibold py-3 rounded-lg transition-colors ${
            canAddToCart
              ? 'bg-forest text-cream hover:bg-forest/90'
              : 'bg-charcoal/10 text-charcoal/60 cursor-not-allowed'
          }`}
        >
          {isSoldOut ? 'Sold out' : canAddToCart ? `Add to cart · ₦${displayPrice.toLocaleString()}` : 'Choose a thread colour'}
        </button>
      </div>
    </div>
  )
}
