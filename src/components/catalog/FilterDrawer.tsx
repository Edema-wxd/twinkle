'use client'

import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { Category, SortOrder } from './FilterBar'

const CATEGORIES: Category[] = ['All', 'Gold', 'Silver', 'Crystal', 'Tools']

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeCategory: Category
  onCategoryChange: (category: Category) => void
  sortOrder: SortOrder
  onSortChange: (sort: SortOrder) => void
  resultCount: number
}

export function FilterDrawer({
  isOpen,
  onClose,
  activeCategory,
  onCategoryChange,
  sortOrder,
  onSortChange,
  resultCount,
}: FilterDrawerProps) {
  return (
    <MobileDrawer isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl text-forest">Filter &amp; sort</h2>
        <button type="button" onClick={onClose} aria-label="Close filters" className="w-11 h-11 -mr-2 flex items-center justify-center text-forest">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="font-heading text-xs uppercase tracking-widest text-charcoal/60 mb-3">
        Category
      </p>
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={activeCategory === cat}
            onClick={() => onCategoryChange(cat)}
            className={`min-h-11 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors cursor-pointer text-left ${
              activeCategory === cat
                ? 'bg-forest text-cream'
                : 'bg-white text-charcoal border border-charcoal/20 hover:bg-forest/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="border-t border-charcoal/10 my-6" />

      <p className="font-heading text-xs uppercase tracking-widest text-charcoal/60 mb-3">
        Sort By
      </p>
      <div className="flex flex-col gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={sortOrder === opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`min-h-11 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors cursor-pointer text-left ${
              sortOrder === opt.value
                ? 'bg-forest text-cream'
                : 'bg-white text-charcoal border border-charcoal/20 hover:bg-forest/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-8 w-full min-h-12 rounded-lg bg-forest font-heading font-semibold text-cream hover:bg-forest/90"
      >
        Show {resultCount} {resultCount === 1 ? 'product' : 'products'}
      </button>
    </MobileDrawer>
  )
}
