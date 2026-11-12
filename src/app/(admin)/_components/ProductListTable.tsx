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
  stock: StockCell[]
}

/** One size's stock for the list: units null = not tracked (In Stock tick only) */
export type StockCell = { name: string; units: number | null; soldOut: boolean; low: boolean }

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
  // Shown above the table instead of a browser pop-up
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    const name = products.find((p) => p.id === productId)?.name ?? 'this product'
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/toggle-active`,
        { method: 'PATCH' }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(`Couldn’t show or hide ${name}: ${body.error ?? res.statusText}. Nothing was changed.`)
        return
      }

      const { is_active } = await res.json()
      setActiveState((prev) => ({ ...prev, [productId]: is_active }))
    } catch (err) {
      console.error('[products] toggle failed', err)
      setError(`Couldn’t reach the server, so ${name} wasn’t changed. Check your connection and try again.`)
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
          className="hidden md:inline-flex ml-auto items-center px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + New product
        </Link>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 px-1 text-red-300 hover:text-white">
            ×
          </button>
        </div>
      )}

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
                <th className="px-4 py-3 text-left font-medium">Stock</th>
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

                    {/* Stock per size */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.stock.length === 0 && <span className="text-xs text-stone-500">No sizes</span>}
                        {product.stock.map((c, i) => (
                          <span
                            key={i}
                            title={c.units === null ? 'Not tracked: In Stock tick decides' : `${c.units} on hand`}
                            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ring-1 ${
                              c.soldOut
                                ? 'bg-red-950/60 text-red-300 ring-red-800'
                                : c.low
                                  ? 'bg-amber-950/60 text-amber-200 ring-amber-700'
                                  : 'bg-stone-800 text-stone-300 ring-stone-700'
                            }`}
                          >
                            {c.name || 'Size'}: {c.soldOut ? 'sold out' : c.units === null ? 'in stock' : c.units.toLocaleString()}
                          </span>
                        ))}
                      </div>
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
