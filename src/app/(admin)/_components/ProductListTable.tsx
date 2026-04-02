'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type ProductRow = {
  id: string
  name: string
  slug: string
  material: string
  is_active: boolean
  is_featured: boolean
  price_min: number
  price_max: number
  created_at: string
}

type Category = 'All' | 'Gold' | 'Silver' | 'Crystal' | 'Tools'

const CATEGORIES: Category[] = ['All', 'Gold', 'Silver', 'Crystal', 'Tools']

function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG')
}

function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatNaira(min)
  return `${formatNaira(min)} – ${formatNaira(max)}`
}

interface ProductListTableProps {
  products: ProductRow[]
}

export function ProductListTable({ products }: ProductListTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  // Optimistic is_active state — key: product id, value: current is_active
  const [activeState, setActiveState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.is_active]))
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Search filter (takes priority over category)
    if (searchQuery.trim().length > 0) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else if (activeCategory !== 'All') {
      result = result.filter((p) => p.material === activeCategory)
    }

    return result
  }, [products, searchQuery, activeCategory])

  async function handleToggleActive(productId: string) {
    setLoadingId(productId)
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/toggle-active`,
        { method: 'PATCH' }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(
          `Failed to update product: ${body.error ?? res.statusText}`
        )
        return
      }

      const { is_active } = await res.json()
      setActiveState((prev) => ({ ...prev, [productId]: is_active }))
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full sm:w-64 px-3 py-2 bg-stone-800 text-white placeholder-stone-500 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gold text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* New product button (also available at page level) */}
        <Link
          href="/admin/products/new"
          className="hidden md:inline-flex ml-auto items-center px-4 py-2 bg-gold hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + New product
        </Link>
      </div>

      {/* Count */}
      <p className="text-stone-400 text-sm">
        {filteredProducts.length}{' '}
        {filteredProducts.length === 1 ? 'product' : 'products'}
      </p>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-stone-800 rounded-lg p-8 text-center text-stone-400">
          No products match your search.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-700">
          <table className="min-w-max w-full text-sm">
            <thead className="bg-stone-800 text-stone-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Price range</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700">
              {filteredProducts.map((product) => {
                const isActive = activeState[product.id] ?? product.is_active
                const isLoading = loadingId === product.id

                return (
                  <tr
                    key={product.id}
                    className="bg-stone-900 hover:bg-stone-800 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3 text-white font-medium">
                      {product.name}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-stone-300">
                      {product.material}
                    </td>

                    {/* Price range */}
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                      {formatPriceRange(product.price_min, product.price_max)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive
                            ? 'bg-emerald-900/60 text-emerald-400 ring-1 ring-emerald-600/40'
                            : 'bg-stone-700 text-stone-400 ring-1 ring-stone-600'
                        }`}
                      >
                        {isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {/* Archive / Restore toggle */}
                        <button
                          onClick={() => handleToggleActive(product.id)}
                          disabled={isLoading}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isActive
                              ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                              : 'bg-gold/20 text-gold hover:bg-gold/30'
                          }`}
                        >
                          {isLoading
                            ? '...'
                            : isActive
                            ? 'Archive'
                            : 'Restore'}
                        </button>

                        {/* Edit button */}
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="px-3 py-1 rounded text-xs font-medium bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
