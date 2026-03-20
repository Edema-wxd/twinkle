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
}

export function FilterDrawer({
  isOpen,
  onClose,
  activeCategory,
  onCategoryChange,
  sortOrder,
  onSortChange,
}: FilterDrawerProps) {
  return (
    <MobileDrawer isOpen={isOpen} onClose={onClose}>
      <h2 className="font-display text-lg text-cocoa mb-6">Filter &amp; Sort</h2>

      <p className="font-heading text-xs uppercase tracking-widest text-charcoal/60 mb-3">
        Category
      </p>
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors cursor-pointer text-left ${
              activeCategory === cat
                ? 'bg-cocoa text-cream'
                : 'bg-stone text-charcoal border border-charcoal/20 hover:bg-cocoa/10'
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
            onClick={() => onSortChange(opt.value)}
            className={`px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors cursor-pointer text-left ${
              sortOrder === opt.value
                ? 'bg-cocoa text-cream'
                : 'bg-stone text-charcoal border border-charcoal/20 hover:bg-cocoa/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </MobileDrawer>
  )
}
