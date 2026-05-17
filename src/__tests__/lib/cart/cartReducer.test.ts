import { describe, it, expect } from 'vitest'
import { cartReducer, lineKey, initialCartState } from '@/lib/cart/cartReducer'
import type { CartItem, CartState } from '@/lib/cart/types'

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prod-1',
    variantId: 'var-1',
    tierQty: 1,
    threadColour: 'gold',
    productName: 'Test Bead',
    variantName: 'Small',
    unitPrice: 5000,
    imageUrl: '/test.jpg',
    isTool: false,
    quantity: 1,
    ...overrides,
  }
}

function withItems(items: CartItem[]): CartState {
  return { ...initialCartState, items }
}

// ─── lineKey ────────────────────────────────────────────────────────────────

describe('lineKey', () => {
  it('produces a composite key from all four fields', () => {
    expect(lineKey(makeItem())).toBe('prod-1:var-1:1:gold')
  })

  it('uses empty string for tool thread colour', () => {
    expect(lineKey(makeItem({ threadColour: '' }))).toBe('prod-1:var-1:1:')
  })

  it('distinguishes different tierQty values', () => {
    const key5 = lineKey(makeItem({ tierQty: 5 }))
    const key10 = lineKey(makeItem({ tierQty: 10 }))
    expect(key5).not.toBe(key10)
  })

  it('distinguishes different thread colours', () => {
    expect(lineKey(makeItem({ threadColour: 'gold' }))).not.toBe(
      lineKey(makeItem({ threadColour: 'silver' }))
    )
  })

  it('distinguishes different variants of the same product', () => {
    expect(lineKey(makeItem({ variantId: 'var-a' }))).not.toBe(
      lineKey(makeItem({ variantId: 'var-b' }))
    )
  })
})

// ─── ADD_ITEM ────────────────────────────────────────────────────────────────

describe('cartReducer — ADD_ITEM', () => {
  it('adds a new item to an empty cart', () => {
    const item = makeItem()
    const state = cartReducer(initialCartState, { type: 'ADD_ITEM', payload: item })
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toEqual(item)
  })

  it('opens the drawer on add', () => {
    const state = cartReducer(initialCartState, { type: 'ADD_ITEM', payload: makeItem() })
    expect(state.isDrawerOpen).toBe(true)
  })

  it('increments quantity for duplicate line items', () => {
    const item = makeItem()
    const state1 = cartReducer(initialCartState, { type: 'ADD_ITEM', payload: item })
    const state2 = cartReducer(state1, { type: 'ADD_ITEM', payload: item })
    expect(state2.items).toHaveLength(1)
    expect(state2.items[0].quantity).toBe(2)
  })

  it('caps quantity at 10 when adding at the limit', () => {
    const item = makeItem({ quantity: 10 })
    const state = cartReducer(withItems([item]), { type: 'ADD_ITEM', payload: item })
    expect(state.items[0].quantity).toBe(10)
  })

  it('treats different thread colours as separate line items', () => {
    const gold = makeItem({ threadColour: 'gold' })
    const silver = makeItem({ threadColour: 'silver' })
    const state = cartReducer(withItems([gold]), { type: 'ADD_ITEM', payload: silver })
    expect(state.items).toHaveLength(2)
  })

  it('treats different tierQty as separate line items', () => {
    const pack5 = makeItem({ tierQty: 5 })
    const pack10 = makeItem({ tierQty: 10 })
    const state = cartReducer(withItems([pack5]), { type: 'ADD_ITEM', payload: pack10 })
    expect(state.items).toHaveLength(2)
  })

  it('treats different variants as separate line items', () => {
    const a = makeItem({ variantId: 'var-a' })
    const b = makeItem({ variantId: 'var-b' })
    const state = cartReducer(withItems([a]), { type: 'ADD_ITEM', payload: b })
    expect(state.items).toHaveLength(2)
  })
})

// ─── UPDATE_QTY ──────────────────────────────────────────────────────────────

describe('cartReducer — UPDATE_QTY', () => {
  it('updates the quantity of the matching item', () => {
    const item = makeItem()
    const state = cartReducer(withItems([item]), {
      type: 'UPDATE_QTY',
      payload: { key: lineKey(item), qty: 4 },
    })
    expect(state.items[0].quantity).toBe(4)
  })

  it('removes the item when qty is 0', () => {
    const item = makeItem()
    const state = cartReducer(withItems([item]), {
      type: 'UPDATE_QTY',
      payload: { key: lineKey(item), qty: 0 },
    })
    expect(state.items).toHaveLength(0)
  })

  it('removes the item when qty is negative', () => {
    const item = makeItem()
    const state = cartReducer(withItems([item]), {
      type: 'UPDATE_QTY',
      payload: { key: lineKey(item), qty: -1 },
    })
    expect(state.items).toHaveLength(0)
  })

  it('does not affect other items', () => {
    const a = makeItem({ productId: 'prod-a' })
    const b = makeItem({ productId: 'prod-b' })
    const state = cartReducer(withItems([a, b]), {
      type: 'UPDATE_QTY',
      payload: { key: lineKey(a), qty: 5 },
    })
    const bItem = state.items.find((i) => i.productId === 'prod-b')
    expect(bItem?.quantity).toBe(1)
  })

  it('is a no-op for unknown key', () => {
    const item = makeItem()
    const state = cartReducer(withItems([item]), {
      type: 'UPDATE_QTY',
      payload: { key: 'unknown-key', qty: 5 },
    })
    expect(state.items[0].quantity).toBe(1)
  })
})

// ─── REMOVE_ITEM ──────────────────────────────────────────────────────────────

describe('cartReducer — REMOVE_ITEM', () => {
  it('removes the item with the matching key', () => {
    const a = makeItem({ productId: 'prod-a' })
    const b = makeItem({ productId: 'prod-b' })
    const state = cartReducer(withItems([a, b]), {
      type: 'REMOVE_ITEM',
      payload: { key: lineKey(a) },
    })
    expect(state.items).toHaveLength(1)
    expect(state.items[0].productId).toBe('prod-b')
  })

  it('is a no-op for unknown key', () => {
    const item = makeItem()
    const state = cartReducer(withItems([item]), {
      type: 'REMOVE_ITEM',
      payload: { key: 'no-match' },
    })
    expect(state.items).toHaveLength(1)
  })
})

// ─── CLEAR_CART ──────────────────────────────────────────────────────────────

describe('cartReducer — CLEAR_CART', () => {
  it('empties all items', () => {
    const state = cartReducer(withItems([makeItem(), makeItem({ productId: 'prod-2' })]), {
      type: 'CLEAR_CART',
    })
    expect(state.items).toHaveLength(0)
  })

  it('preserves drawer state', () => {
    const state = cartReducer({ items: [makeItem()], isDrawerOpen: true }, { type: 'CLEAR_CART' })
    expect(state.isDrawerOpen).toBe(true)
  })
})

// ─── DRAWER ──────────────────────────────────────────────────────────────────

describe('cartReducer — drawer', () => {
  it('OPEN_DRAWER sets isDrawerOpen true', () => {
    const state = cartReducer({ ...initialCartState, isDrawerOpen: false }, { type: 'OPEN_DRAWER' })
    expect(state.isDrawerOpen).toBe(true)
  })

  it('CLOSE_DRAWER sets isDrawerOpen false', () => {
    const state = cartReducer({ ...initialCartState, isDrawerOpen: true }, { type: 'CLOSE_DRAWER' })
    expect(state.isDrawerOpen).toBe(false)
  })
})

// ─── HYDRATE ─────────────────────────────────────────────────────────────────

describe('cartReducer — HYDRATE', () => {
  it('replaces existing items with the payload', () => {
    const existing = makeItem({ productId: 'old' })
    const fresh = makeItem({ productId: 'new' })
    const state = cartReducer(withItems([existing]), { type: 'HYDRATE', payload: [fresh] })
    expect(state.items).toHaveLength(1)
    expect(state.items[0].productId).toBe('new')
  })

  it('hydrates to empty array', () => {
    const state = cartReducer(withItems([makeItem()]), { type: 'HYDRATE', payload: [] })
    expect(state.items).toHaveLength(0)
  })
})
