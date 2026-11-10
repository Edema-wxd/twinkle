'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/lib/types/product'
import { CatalogProductCard } from './CatalogProductCard'
import { FilterBar, Category, SortOrder } from './FilterBar'
import { FilterDrawer } from './FilterDrawer'
import { SearchInput } from './SearchInput'

interface CatalogClientProps {
  products: Product[]
}

export function CatalogClient({ products }: CatalogClientProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    let result = [...products]

    const q = searchQuery.trim().toLowerCase()
    if (q.length > 0) {
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.material.toLowerCase().includes(q))
    }
    if (activeCategory !== 'All') {
      result = result.filter((p) => p.material === activeCategory)
    }

    if (sortOrder === 'price_asc') {
      result.sort((a, b) => a.price_min - b.price_min)
    } else if (sortOrder === 'price_desc') {
      result.sort((a, b) => b.price_min - a.price_min)
    } else {
      // 'latest'
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    return result
  }, [products, activeCategory, sortOrder, searchQuery])

  const hasFilters = searchQuery.trim().length > 0 || activeCategory !== 'All'
  const showEmptyMessage = filteredProducts.length === 0

  function clearFilters() {
    setSearchQuery('')
    setActiveCategory('All')
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl text-forest mb-2">
          The Collection
        </h1>
        <p className="font-body text-charcoal/60 mb-8">
          Premium loc bead accessories, handcrafted in Nigeria.
        </p>

        {/* Controls bar */}
        <div className="flex gap-3 flex-wrap mb-8 items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* FilterBar — desktop only */}
          <div className="hidden md:flex items-center gap-3">
            <FilterBar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
            />
          </div>

          {/* Filters button — mobile only */}
          <button
            type="button"
            className="md:hidden min-h-11 bg-white border border-charcoal/20 rounded-lg px-4 py-2 text-sm font-body text-charcoal cursor-pointer"
            onClick={() => setIsFilterOpen(true)}
          >
            Filters{activeCategory !== 'All' ? ` · ${activeCategory}` : ''}
          </button>
        </div>

        <p aria-live="polite" className="sr-only">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} shown
        </p>

        {showEmptyMessage ? (
          <div className="rounded-2xl bg-white ring-1 ring-forest/10 px-6 py-14 text-center">
            <p className="font-heading font-semibold text-forest">
              {products.length === 0 ? 'New pieces are on the way' : 'Nothing matches that yet'}
            </p>
            <p className="mt-1 font-body text-sm text-charcoal/70">
              {products.length === 0 ? 'Check back soon or ask us on WhatsApp.' : 'Try another word, or browse everything.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-forest px-5 font-heading text-sm font-semibold text-cream hover:bg-forest/90"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {filteredProducts.map((p) => (
              <CatalogProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* Filter Drawer — mobile */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        resultCount={filteredProducts.length}
      />
    </div>
  )
}
