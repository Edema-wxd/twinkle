import { describe, it, expect } from 'vitest'
import { cleanProductName, formatPerBead, packsLeft, perBeadPrice, resolveDefaultSelection, selectionPrice } from '@/lib/landing/selection'
import type { ProductVariant } from '@/lib/types/product'

const v4: ProductVariant = {
  id: 'v4',
  name: '4mm',
  price: 13590,
  in_stock: true,
  price_tiers: [
    { qty: 50, price: 13590 },
    { qty: 100, price: 18903 },
  ],
}
const v6: ProductVariant = { id: 'v6', name: '6mm', price: 15885, in_stock: true, price_tiers: [{ qty: 25, price: 15885 }, { qty: 50, price: 22804 }] }
const product = { material: 'Gold' as const, variants: [v4, v6], price_min: 13590 }

describe('resolveDefaultSelection', () => {
  it('prefers the best-seller, then the fallback, then the first in-stock size', () => {
    const popular = { packs: [{ variantId: 'v6', tierQty: 50 }], threadColour: 'red' }
    const fallback = { size: '4mm', pack: 100, thread: 'blonde' }
    expect(resolveDefaultSelection(product, popular, fallback)).toEqual({ variantId: 'v6', tierQty: 50, thread: 'red' })
    expect(resolveDefaultSelection(product, { packs: [], threadColour: null }, fallback)).toEqual({ variantId: 'v4', tierQty: 100, thread: 'blonde' })
    expect(resolveDefaultSelection(product, null, null)).toEqual({ variantId: 'v4', tierQty: 50, thread: 'black' })
  })

  it('skips a best-selling pack the product no longer offers', () => {
    const popular = { packs: [{ variantId: 'v4', tierQty: 200 }, { variantId: 'gone', tierQty: 50 }], threadColour: null }
    expect(resolveDefaultSelection(product, popular, null)).toEqual({ variantId: 'v4', tierQty: 50, thread: 'black' })
  })
})

describe('card numbers', () => {
  it('prices the selection like the product page', () => {
    expect(selectionPrice(product, { variantId: 'v4', tierQty: 100 })).toBe(18903)
    expect(selectionPrice(product, { variantId: 'v4', tierQty: 999 })).toBe(13590) // falls back to the variant price
  })

  it('gives a per-bead price only for packs bigger than the smallest', () => {
    expect(perBeadPrice(v4, 50)).toBeNull()
    expect(perBeadPrice(v4, 100)).toBeCloseTo(189.03)
    expect(formatPerBead(189.03)).toBe('₦189')
    expect(formatPerBead(7.25)).toBe('₦7.3')
  })

  it('counts whole packs left only when stock is tracked', () => {
    expect(packsLeft(v4, 50)).toBeNull()
    expect(packsLeft({ ...v4, stock: 730 }, 50)).toBe(14)
    expect(packsLeft({ ...v4, stock: 730 }, 100)).toBe(7)
  })

  it('drops emoji from names', () => {
    expect(cleanProductName('Gold Twinkles ✨')).toBe('Gold Twinkles')
    expect(cleanProductName('✨24k  Gold✨ Twinkles️')).toBe('24k Gold Twinkles')
  })
})
