'use client'

import { useState, useEffect, useRef } from 'react'
import { MockProduct } from '@/lib/mock/products'

interface AddToCartModalProps {
  product: MockProduct
  onClose: () => void
}

export function AddToCartModal({ product, onClose }: AddToCartModalProps) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id ?? '')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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

        <p className="font-body text-sm text-charcoal/60 mb-6">{product.name}</p>

        <div>
          <p className="font-heading font-semibold text-cocoa text-sm mb-3">Size:</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => { if (variant.in_stock) setSelectedVariant(variant.id) }}
                disabled={!variant.in_stock}
                className={`rounded-lg px-4 py-2 font-body text-sm transition-all ${
                  selectedVariant === variant.id
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

        <button
          onClick={onClose}
          className="w-full bg-gold text-cocoa font-heading font-semibold py-3 rounded-lg hover:bg-terracotta hover:text-cream transition-colors"
        >
          Add to cart
          {/* TODO: Phase 5 — wire to cart context */}
        </button>
      </div>
    </div>
  )
}
