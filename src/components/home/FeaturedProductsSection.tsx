'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'
import { AddToCartModal } from './AddToCartModal'
import { Product } from '@/lib/types/product'

interface FeaturedProductsSectionProps {
  products: Product[]
}

export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <section className="relative overflow-hidden bg-cream py-20 px-4">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.05] pointer-events-none z-0" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-body text-sm text-gold uppercase tracking-widest mb-3">
            Featured Products
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-forest leading-tight">
            Our best-loved beads
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={() => setSelectedProduct(p)}
            />
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/catalog"
            className="inline-block bg-forest text-cream font-heading font-semibold px-10 py-4 rounded-lg hover:bg-forest/80 transition-colors text-base"
          >
            Shop the Collection
          </Link>
        </div>
      </div>

      {selectedProduct && (
        <AddToCartModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  )
}
