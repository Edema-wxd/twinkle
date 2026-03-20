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

    if (searchQuery.trim().length > 0) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else if (activeCategory !== 'All') {
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

  const showEmptyMessage =
    searchQuery.trim().length > 0 && filteredProducts.length === 0

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl text-cocoa mb-2">
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
            className="md:hidden bg-stone border border-charcoal/20 rounded-lg px-4 py-2 text-sm font-body text-charcoal cursor-pointer"
            onClick={() => setIsFilterOpen(true)}
          >
            Filters
          </button>
        </div>

        {/* Empty state message */}
        {showEmptyMessage && (
          <p className="font-body text-charcoal/60 text-center py-8">
            No products match &ldquo;{searchQuery}&rdquo; — showing all products
          </p>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(showEmptyMessage ? products : filteredProducts).map((p) => (
            <CatalogProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>

      {/* Filter Drawer — mobile */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeCategory={activeCategory}
        onCategoryChange={(cat) => {
          setActiveCategory(cat)
          setIsFilterOpen(false)
        }}
        sortOrder={sortOrder}
        onSortChange={(sort) => {
          setSortOrder(sort)
          setIsFilterOpen(false)
        }}
      />
    </div>
  )
}
