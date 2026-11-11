import { describe, it, expect, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {}, productStock: {} }))

import { smallestPack, withStock, aggregateNeeds } from '@/lib/stock'
import { packFits, firstFittingTier, lowStockLabel } from '@/lib/stockDisplay'
import type { ProductVariant } from '@/lib/types/product'

const beads = (over: Partial<ProductVariant> = {}): ProductVariant =>
  ({
    id: 'v4',
    name: '4mm',
    in_stock: true,
    price: 15000,
    price_tiers: [
      { qty: 50, price: 15000 },
      { qty: 100, price: 28000 },
    ],
    ...over,
  }) as ProductVariant

describe('smallestPack', () => {
  it('is the smallest tier', () => expect(smallestPack(beads())).toBe(50))
  it('is 1 for items sold singly (no tiers)', () => expect(smallestPack({ price_tiers: [] } as never)).toBe(1))
})

describe('withStock', () => {
  const map = (n: number) => new Map<`${string}:${string}`, number>([['p1:v4', n]])

  it('leaves untracked sizes alone (stock null)', () => {
    const [v] = withStock('p1', [beads()], new Map<`${string}:${string}`, number>())
    expect(v.stock).toBeNull()
    expect(v.in_stock).toBe(true)
  })

  it('stays on sale while at least the smallest pack is left', () => {
    const [v] = withStock('p1', [beads()], map(50))
    expect(v).toMatchObject({ stock: 50, in_stock: true })
  })

  it('sells out once fewer beads than the smallest pack remain', () => {
    const [v] = withStock('p1', [beads()], map(49))
    expect(v).toMatchObject({ stock: 49, in_stock: false })
  })

  it("keeps the admin's manual 'out of stock' even with stock left", () => {
    const [v] = withStock('p1', [beads({ in_stock: false })], map(500))
    expect(v.in_stock).toBe(false)
  })
})

describe('aggregateNeeds', () => {
  it('adds up lines of the same size, e.g. two thread colours', () => {
    const needs = aggregateNeeds([
      { productId: 'p1', variantId: 'v4', tierQty: 100, quantity: 1, label: 'Gold 4mm' },
      { productId: 'p1', variantId: 'v4', tierQty: 50, quantity: 2, label: 'Gold 4mm' },
      { productId: 'p1', variantId: 'v6', tierQty: 50, quantity: 1, label: 'Gold 6mm' },
    ])
    expect(needs).toEqual([
      { productId: 'p1', variantId: 'v4', units: 200, label: 'Gold 4mm' },
      { productId: 'p1', variantId: 'v6', units: 50, label: 'Gold 6mm' },
    ])
  })

  it('counts tools one per item', () => {
    expect(aggregateNeeds([{ productId: 't', variantId: 's1', tierQty: 1, quantity: 3, label: 'Shears' }])[0].units).toBe(3)
  })
})

describe('stock display', () => {
  it('packFits: a pack fits only if that many beads are left', () => {
    expect(packFits(beads({ stock: 120 }), 100)).toBe(true)
    expect(packFits(beads({ stock: 80 }), 100)).toBe(false)
    expect(packFits(beads({ stock: null }), 100)).toBe(true)
    expect(packFits(beads({ in_stock: false }), 50)).toBe(false)
    expect(packFits(undefined, 50)).toBe(false)
  })

  it('firstFittingTier picks the first pack that can still be supplied', () => {
    expect(firstFittingTier(beads({ stock: 60 }))).toBe(50)
    expect(firstFittingTier(beads({ stock: null }))).toBe(50)
  })

  it('lowStockLabel warns when under two of the biggest pack are left', () => {
    expect(lowStockLabel(beads({ stock: 120 }), false)).toBe('Only 120 beads left in 4mm')
    expect(lowStockLabel(beads({ stock: 500 }), false)).toBeNull()
    expect(lowStockLabel(beads({ stock: null }), false)).toBeNull()
  })

  it('lowStockLabel counts items for tools', () => {
    const shears = beads({ name: 'Standard', price_tiers: [{ qty: 1, price: 3500 }], stock: 3 })
    expect(lowStockLabel(shears, true)).toBe('Only 3 left')
    expect(lowStockLabel({ ...shears, stock: 9 }, true)).toBeNull()
  })
})
