import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * priceOrder() is what stops a tampered checkout: it re-prices every paid order
 * on the server from the catalogue, ignoring the prices the browser sent.
 * recordPaidOrder() then compares its total with what Paystack actually charged.
 */

const { state } = vi.hoisted(() => ({
  state: {
    products: [] as Record<string, unknown>[],
    promo: null as Record<string, unknown> | null,
    stock: new Map<string, number>(),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('drizzle-orm', () => ({ and: vi.fn(), eq: vi.fn(), gte: vi.fn(), inArray: vi.fn(), sql: vi.fn() }))
vi.mock('@/db', () => {
  const products = { __table: 'products', id: 'id', name: 'name', slug: 'slug', variants: 'variants', isActive: 'isActive', material: 'material' }
  const promoCodes = { __table: 'promo', code: 'code' }
  const query = (table: { __table: string }) => {
    const rows = () => (table.__table === 'products' ? state.products : state.promo ? [state.promo] : [])
    const chain = { where: () => Object.assign(Promise.resolve(rows()), { limit: () => Promise.resolve(rows()) }) }
    return chain
  }
  return {
    db: { select: () => ({ from: query }) },
    products,
    promoCodes,
    orders: {},
    orderItems: {},
    abandonedOrders: {},
    productStock: {},
  }
})
vi.mock('@/lib/stock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stock')>()
  return { ...actual, getStockMap: vi.fn(async () => state.stock) }
})
vi.mock('@/lib/checkout/shippingInfo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/checkout/shippingInfo')>()
  const { LAGOS_ZONES } = await import('@/lib/checkout/shippingZones')
  return {
    ...actual,
    getShippingInfo: vi.fn(async () => ({
      zones: LAGOS_ZONES.map((z) => ({ ...z, fee: z.defaultFee })),
      lagosFrom: 3000,
      lagosTo: 13500,
      otherRate: 4500,
      otherDays: '3–5 business days',
      intlMessage: '',
      pageIntro: '',
    })),
  }
})

import { priceOrder, parseCheckoutMetadata, type CheckoutMetadata, type ClaimedItem } from '@/lib/payments/paidOrder'

const GOLD = '11111111-1111-1111-1111-111111111111'
const SHEARS = '22222222-2222-2222-2222-222222222222'

const goldRow = (over: Record<string, unknown> = {}) => ({
  id: GOLD,
  name: 'Gold Twinkles',
  slug: 'gold-twinkles',
  isActive: true,
  material: 'Gold',
  variants: [
    { id: 'v4', name: '4mm', in_stock: true, price: 15000, price_tiers: [{ qty: 50, price: 15000 }, { qty: 100, price: 28000 }] },
  ],
  ...over,
})
const shearsRow = { id: SHEARS, name: 'Shears', slug: 'shears', isActive: true, material: 'Tools', variants: [{ id: 's1', name: 'Standard', in_stock: true, price: 3500, price_tiers: [] }] }

const line = (over: Partial<ClaimedItem> = {}): ClaimedItem => ({
  productId: GOLD,
  productName: 'Gold Twinkles',
  variantId: 'v4',
  variantName: '4mm',
  tierQty: 50,
  threadColour: 'black',
  unitPrice: 15000,
  quantity: 1,
  isTool: false,
  ...over,
})
const order = (items: ClaimedItem[], extra: Partial<CheckoutMetadata> = {}): CheckoutMetadata => ({
  cart_items: items,
  customer_details: { first_name: 'Ada', last_name: 'O', phone: '0803', delivery_address: '1 Allen', state: 'Abuja' },
  ...extra,
})

beforeEach(() => {
  state.products = [goldRow(), shearsRow]
  state.promo = null
  state.stock = new Map()
})

describe('priceOrder: honest orders', () => {
  it('prices from the catalogue and adds delivery', async () => {
    const p = await priceOrder(order([line({ tierQty: 100, unitPrice: 28000 }), line({ productId: SHEARS, productName: 'Shears', variantId: 's1', variantName: 'Standard', tierQty: 1, unitPrice: 3500, quantity: 2, isTool: true })]))
    expect(p.problems).toEqual([])
    expect(p.subtotal).toBe(28000 + 7000)
    expect(p.shipping).toBe(4500)
    expect(p.total).toBe(28000 + 7000 + 4500)
    expect(p.slugs).toEqual(['gold-twinkles', 'shears'])
  })

  it('charges the Lagos zone fee for a Lagos area', async () => {
    const p = await priceOrder(order([line()], { customer_details: { first_name: 'A', last_name: 'B', phone: '1', delivery_address: 'x', state: 'Lagos', lga: 'Lekki Phase 1' } }))
    expect(p.shipping).toBe(3000)
  })
})

describe('priceOrder: tampered or broken orders', () => {
  it('ignores a price edited in the browser and uses the real one', async () => {
    const p = await priceOrder(order([line({ unitPrice: 100 })]))
    expect(p.lines[0].serverUnitPrice).toBe(15000)
    expect(p.subtotal).toBe(15000)
  })

  it('rejects a pack size the product does not sell', async () => {
    const p = await priceOrder(order([line({ tierQty: 75 })]))
    expect(p.lines[0].status).toBe('unavailable')
    expect(p.problems.join(' ')).toMatch(/no pack of 75/)
  })

  it('flags products taken off the shop, deleted, or with a removed size', async () => {
    state.products = [goldRow({ isActive: false })]
    expect((await priceOrder(order([line()]))).problems.join(' ')).toMatch(/taken off the shop/)
    state.products = []
    expect((await priceOrder(order([line()]))).problems.join(' ')).toMatch(/no longer exists/)
    state.products = [goldRow()]
    expect((await priceOrder(order([line({ variantId: 'v9', variantName: '9mm' })]))).problems.join(' ')).toMatch(/no "9mm" option/)
  })

  it('never looks up an id that is not a real product id', async () => {
    const p = await priceOrder(order([line({ productId: "x' OR 1=1" })]))
    expect(p.lines[0].status).toBe('unavailable')
  })

  it('flags quantities outside 1 to 10', async () => {
    expect((await priceOrder(order([line({ quantity: 0 })]))).problems.join(' ')).toMatch(/invalid quantity/)
    expect((await priceOrder(order([line({ quantity: 11 })]))).problems.join(' ')).toMatch(/invalid quantity/)
  })
})

describe('priceOrder: stock', () => {
  it('marks a size sold out once fewer beads than the smallest pack remain', async () => {
    state.stock = new Map([[`${GOLD}:v4`, 40]])
    const p = await priceOrder(order([line()]))
    expect(p.lines[0].status).toBe('sold_out')
  })

  it('counts two thread colours of the same size against one stock count', async () => {
    state.stock = new Map([[`${GOLD}:v4`, 120]])
    const p = await priceOrder(order([line({ tierQty: 100, unitPrice: 28000 }), line({ threadColour: 'gold' })]))
    expect(p.lines.map((l) => l.status)).toEqual(['low_stock', 'low_stock'])
    expect(p.problems.join(' ')).toMatch(/Only 120 beads left of "Gold Twinkles 4mm", but the order needs 150/)
  })

  it('is fine when there is exactly enough', async () => {
    state.stock = new Map([[`${GOLD}:v4`, 150]])
    const p = await priceOrder(order([line({ tierQty: 100, unitPrice: 28000 }), line({ threadColour: 'gold' })]))
    expect(p.problems).toEqual([])
  })
})

describe('priceOrder: promo codes', () => {
  const promo = (over: Record<string, unknown>) => ({ code: 'SAVE', isActive: true, expiresAt: null, maxUses: null, currentUses: 0, discountType: 'percentage', discountValue: 10, ...over })

  it('applies a percentage discount (rounded down)', async () => {
    state.promo = promo({ discountType: 'percentage', discountValue: 10 })
    const p = await priceOrder(order([line()], { promo_code: 'save' }))
    expect(p).toMatchObject({ discount: 1500, promoCode: 'SAVE', total: 15000 - 1500 + 4500 })
  })

  it('caps a fixed discount at the subtotal', async () => {
    state.promo = promo({ discountType: 'fixed', discountValue: 99999 })
    const p = await priceOrder(order([line()], { promo_code: 'SAVE' }))
    expect(p.discount).toBe(15000)
    expect(p.total).toBe(4500)
  })

  it('makes delivery free for a free-shipping code', async () => {
    state.promo = promo({ discountType: 'free_shipping' })
    const p = await priceOrder(order([line()], { promo_code: 'SAVE' }))
    expect(p).toMatchObject({ shipping: 0, discount: 0, total: 15000 })
  })

  it.each([
    ['inactive', { isActive: false }],
    ['expired', { expiresAt: new Date('2020-01-01') }],
    ['used up', { maxUses: 5, currentUses: 5 }],
  ])('refuses a code that is %s and flags it', async (_label, over) => {
    state.promo = promo(over)
    const p = await priceOrder(order([line()], { promo_code: 'SAVE' }))
    expect(p.discount).toBe(0)
    expect(p.promoCode).toBeNull()
    expect(p.problems.join(' ')).toMatch(/isn't valid any more/)
  })
})

describe('parseCheckoutMetadata', () => {
  it('accepts a well-formed payload', () => {
    expect(parseCheckoutMetadata(order([line()]))?.cart_items).toHaveLength(1)
  })

  it.each([
    ['nothing', null],
    ['no customer details', { cart_items: [line()] }],
    ['an empty bag', { ...order([]) }],
    ['more than 50 lines', order(Array.from({ length: 51 }, () => line()))],
    ['a malformed line', order([{ ...line(), quantity: 'two' } as unknown as ClaimedItem])],
  ])('rejects %s', (_label, raw) => {
    expect(parseCheckoutMetadata(raw)).toBeNull()
  })
})
