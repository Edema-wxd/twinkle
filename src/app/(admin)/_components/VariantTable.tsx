'use client'

import { useState } from 'react'

export interface VariantRow {
  id: string
  name: string
  price: number
  in_stock: boolean
  price_tiers: { qty: number; price: number }[]
}

interface VariantTableProps {
  variants: VariantRow[]
  onChange: (variants: VariantRow[]) => void
}

export function VariantTable({ variants, onChange }: VariantTableProps) {
  const [expandedTiersId, setExpandedTiersId] = useState<string | null>(null)

  function updateVariant(id: string, patch: Partial<VariantRow>) {
    onChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  function deleteVariant(id: string) {
    onChange(variants.filter((v) => v.id !== id))
  }

  function addVariant() {
    const newVariant: VariantRow = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      in_stock: true,
      price_tiers: [{ qty: 1, price: 0 }],
    }
    onChange([...variants, newVariant])
  }

  function updateTier(
    variantId: string,
    tierIndex: number,
    field: 'qty' | 'price',
    value: number
  ) {
    onChange(
      variants.map((v) => {
        if (v.id !== variantId) return v
        const tiers = v.price_tiers.map((t, i) =>
          i === tierIndex ? { ...t, [field]: value } : t
        )
        return { ...v, price_tiers: tiers }
      })
    )
  }

  function addTier(variantId: string) {
    onChange(
      variants.map((v) => {
        if (v.id !== variantId) return v
        return {
          ...v,
          price_tiers: [...v.price_tiers, { qty: 1, price: 0 }],
        }
      })
    )
  }

  function removeTier(variantId: string, tierIndex: number) {
    onChange(
      variants.map((v) => {
        if (v.id !== variantId) return v
        const tiers = v.price_tiers.filter((_, i) => i !== tierIndex)
        return { ...v, price_tiers: tiers.length > 0 ? tiers : [{ qty: 1, price: 0 }] }
      })
    )
  }

  function tierSummary(tiers: { qty: number; price: number }[]): string {
    return tiers
      .slice(0, 3)
      .map((t) => `${t.qty}\u00d7\u20a6${t.price.toLocaleString('en-NG')}`)
      .join(', ') + (tiers.length > 3 ? '…' : '')
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-stone-600">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-700 text-stone-300">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Price (₦)</th>
              <th className="px-3 py-2 font-medium text-center">In Stock</th>
              <th className="px-3 py-2 font-medium">Price Tiers</th>
              <th className="px-3 py-2 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700">
            {variants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-stone-500">
                  No variants yet. Click &quot;+ Add variant&quot; below.
                </td>
              </tr>
            )}
            {variants.map((v) => (
              <>
                <tr key={v.id} className="bg-stone-800 hover:bg-stone-750">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                      placeholder="e.g. 4mm"
                      className="w-full bg-stone-900 border border-stone-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={v.price}
                      min={0}
                      onChange={(e) =>
                        updateVariant(v.id, { price: Number(e.target.value) })
                      }
                      className="w-28 bg-stone-900 border border-stone-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={v.in_stock}
                      onChange={(e) => updateVariant(v.id, { in_stock: e.target.checked })}
                      className="w-4 h-4 accent-amber-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400 text-xs truncate max-w-[140px]">
                        {tierSummary(v.price_tiers)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTiersId(expandedTiersId === v.id ? null : v.id)
                        }
                        className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
                      >
                        {expandedTiersId === v.id ? 'Close' : 'Edit tiers'}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => deleteVariant(v.id)}
                      aria-label="Delete variant"
                      className="text-stone-500 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      &times;
                    </button>
                  </td>
                </tr>

                {/* Expanded tier editor */}
                {expandedTiersId === v.id && (
                  <tr key={`${v.id}-tiers`} className="bg-stone-900">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-stone-400 mb-2">
                          Price tiers for &quot;{v.name || 'this variant'}&quot;
                        </p>
                        {v.price_tiers.map((tier, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <label className="text-xs text-stone-400 w-14">Qty:</label>
                            <input
                              type="number"
                              value={tier.qty}
                              min={1}
                              onChange={(e) =>
                                updateTier(v.id, idx, 'qty', Number(e.target.value))
                              }
                              className="w-20 bg-stone-800 border border-stone-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <label className="text-xs text-stone-400 w-14">Price ₦:</label>
                            <input
                              type="number"
                              value={tier.price}
                              min={0}
                              onChange={(e) =>
                                updateTier(v.id, idx, 'price', Number(e.target.value))
                              }
                              className="w-24 bg-stone-800 border border-stone-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            {v.price_tiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTier(v.id, idx)}
                                className="text-stone-500 hover:text-red-400 text-sm"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTier(v.id)}
                          className="text-xs text-amber-400 hover:text-amber-300 mt-1"
                        >
                          + Add tier
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addVariant}
        className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
      >
        + Add variant
      </button>
    </div>
  )
}
