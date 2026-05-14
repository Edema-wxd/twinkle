'use client'

export type Category = 'All' | 'Gold' | 'Silver' | 'Crystal' | 'Tools'
export type SortOrder = 'price_asc' | 'price_desc' | 'latest'

const CATEGORIES: Category[] = ['All', 'Gold', 'Silver', 'Crystal', 'Tools']

interface FilterBarProps {
  activeCategory: Category
  onCategoryChange: (category: Category) => void
  sortOrder: SortOrder
  onSortChange: (sort: SortOrder) => void
}

export function FilterBar({
  activeCategory,
  onCategoryChange,
  sortOrder,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className={`px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors cursor-pointer ${
            activeCategory === cat
              ? 'bg-forest text-cream'
              : 'bg-white text-charcoal border border-charcoal/20 hover:bg-forest/10'
          }`}
        >
          {cat}
        </button>
      ))}

      <select
        value={sortOrder}
        onChange={(e) => onSortChange(e.target.value as SortOrder)}
        className="ml-auto font-body text-sm bg-white border border-charcoal/20 rounded-lg px-3 py-1.5 text-charcoal cursor-pointer"
      >
        <option value="latest">Latest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  )
}
