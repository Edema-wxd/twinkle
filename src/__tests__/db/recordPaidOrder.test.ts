import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real Postgres (PGlite) instead of Neon: the atomic stock update, the
// duplicate-order guard and the promo counter are what's under test here.
vi.mock('@/db', () => import('../helpers/pgliteDb'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { eq } from 'drizzle-orm'
import { db, resetDb, products, productStock, orders, orderItems, promoCodes, abandonedOrders } from '../helpers/pgliteDb'
import { recordPaidOrder, type ChargeInput, type ClaimedItem } from '@/lib/payments/paidOrder'
import { LAGOS_ZONES } from '@/lib/checkout/shippingZones'
import { settings } from '../helpers/pgliteDb'

const GOLD = '11111111-1111-1111-1111-111111111111'
const SHEARS = '22222222-2222-2222-2222-222222222222'

const gold = (over: Partial<ClaimedItem> = {}): ClaimedItem => ({
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
const shears = (quantity: number): ClaimedItem => ({
  productId: SHEARS,
  productName: 'Shears',
  variantId: 's1',
  variantName: 'Standard',
  tierQty: 1,
  threadColour: '',
  unitPrice: 3500,
  quantity,
  isTool: true,
})

/** A successful Paystack charge for these lines, delivered to Abuja (flat ₦4,500). */
function charge(reference: string, items: ClaimedItem[], amountNaira: number, extra: Record<string, unknown> = {}): ChargeInput {
  return {
    reference,
    amountKobo: amountNaira * 100,
    currency: 'NGN',
    customerEmail: 'Ada@Example.com',
    ipAddress: '102.89.1.1',
    payload: { reference },
    metadata: {
      cart_items: items,
      customer_details: { first_name: 'Ada', last_name: 'Obi', phone: '0803', delivery_address: '1 Allen', state: 'Abuja' },
      ...extra,
    },
  }
}

const stockOf = async (productId: string, variantId: string) =>
  (await db.select().from(productStock).where(eq(productStock.productId, productId))).find((r) => r.variantId === variantId)?.units

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await resetDb()
  await db.insert(products).values([
    {
      id: GOLD,
      name: 'Gold Twinkles',
      slug: 'gold-twinkles',
      material: 'Gold',
      priceMin: 15000,
      priceMax: 28000,
      variants: [{ id: 'v4', name: '4mm', in_stock: true, price: 15000, price_tiers: [{ qty: 50, price: 15000 }, { qty: 100, price: 28000 }] }],
    },
    {
      id: SHEARS,
      name: 'Shears',
      slug: 'shears',
      material: 'Tools',
      priceMin: 3500,
      priceMax: 3500,
      variants: [{ id: 's1', name: 'Standard', in_stock: true, price: 3500, price_tiers: [{ qty: 1, price: 3500 }] }],
    },
  ])
  await db.insert(productStock).values([
    { productId: GOLD, variantId: 'v4', units: 500 },
    { productId: SHEARS, variantId: 's1', units: 3 },
  ])
})

describe('recordPaidOrder (real database)', () => {
  it('records an honest payment as paid, with items, and takes the stock', async () => {
    const r = await recordPaidOrder(charge('tw-1', [gold({ tierQty: 100, unitPrice: 28000 })], 28000 + 4500))
    expect(r).toMatchObject({ created: true, status: 'paid', paymentIssue: null, totalNaira: 32500, amountPaidNaira: 32500, customerEmail: 'ada@example.com' })
    const items = await db.select().from(orderItems)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ productName: 'Gold Twinkles', tierQty: 100, unitPrice: 28000, lineTotal: 28000, threadColour: 'black' })
    expect(await stockOf(GOLD, 'v4')).toBe(400)
  })

  it('a webhook retry returns the same order and never takes stock twice', async () => {
    const c = charge('tw-2', [gold()], 15000 + 4500)
    await recordPaidOrder(c)
    const again = await recordPaidOrder(c)
    expect(again).toMatchObject({ created: false, status: 'paid' })
    expect(await db.$count(orders)).toBe(1)
    expect(await stockOf(GOLD, 'v4')).toBe(450)
  })

  it('the webhook and the verify call arriving together create one order', async () => {
    const c = charge('tw-3', [gold()], 15000 + 4500)
    const [a, b] = await Promise.all([recordPaidOrder(c), recordPaidOrder(c)])
    expect(a?.orderId).toBe(b?.orderId)
    expect(await db.$count(orders)).toBe(1)
    expect(await db.$count(orderItems)).toBe(1)
    expect(await stockOf(GOLD, 'v4')).toBe(450)
  })

  it('holds a short payment for review instead of marking it paid', async () => {
    const r = await recordPaidOrder(charge('tw-4', [gold({ unitPrice: 100 })], 100 + 4500))
    expect(r?.status).toBe('payment_review')
    expect(r?.paymentIssue).toMatch(/short by/)
    // stored with the real prices, not the tampered ones
    const [o] = await db.select().from(orders)
    expect(o).toMatchObject({ subtotal: 15000, total: 19500, amountPaid: 4600 })
    expect((await db.select().from(orderItems))[0].unitPrice).toBe(15000)
  })

  it('two orders racing for the last shears: one gets them, the other is held, stock never goes negative', async () => {
    const [a, b] = await Promise.all([
      recordPaidOrder(charge('tw-5a', [shears(2)], 7000 + 4500)),
      recordPaidOrder(charge('tw-5b', [shears(2)], 7000 + 4500)),
    ])
    const statuses = [a?.status, b?.status].sort()
    expect(statuses).toEqual(['paid', 'payment_review'])
    const held = [a, b].find((x) => x?.status === 'payment_review')
    expect(held?.paymentIssue).toMatch(/Not enough stock for "Shears Standard": needed 2, only 1 left/)
    expect(await stockOf(SHEARS, 's1')).toBe(1)
  })

  it('applies a valid promo code and counts its use', async () => {
    await db.insert(promoCodes).values({ code: 'SAVE10', discountType: 'percentage', discountValue: 10 })
    const r = await recordPaidOrder(charge('tw-6', [gold()], 15000 - 1500 + 4500, { promo_code: 'save10' }))
    expect(r?.status).toBe('paid')
    const [o] = await db.select().from(orders)
    expect(o).toMatchObject({ promoCode: 'SAVE10', discountAmount: 1500, total: 18000 })
    expect((await db.select().from(promoCodes))[0].currentUses).toBe(1)
  })

  it('marks the customer’s recent abandoned checkout as recovered', async () => {
    await db.insert(abandonedOrders).values({
      customerName: 'Ada Obi',
      customerEmail: 'ada@example.com',
      customerPhone: '0803',
      deliveryAddress: '1 Allen',
      deliveryState: 'Abuja',
      shippingCost: '4500',
      subtotal: '15000',
      total: '19500',
      cartItems: [],
    })
    await recordPaidOrder(charge('tw-7', [gold()], 19500))
    expect((await db.select().from(abandonedOrders))[0].recovered).toBe(true)
  })

  it('never rewinds a shipped order to paid on a late webhook', async () => {
    const c = charge('tw-8', [gold()], 19500)
    const r = await recordPaidOrder(c)
    await db.update(orders).set({ status: 'shipped' }).where(eq(orders.id, r!.orderId))
    expect((await recordPaidOrder(c))?.status).toBe('shipped')
  })

  it('ignores a charge with unusable metadata', async () => {
    expect(await recordPaidOrder({ ...charge('tw-9', [gold()], 19500), metadata: { nonsense: true } })).toBeNull()
    expect(await db.$count(orders)).toBe(0)
  })

  describe('free Lagos delivery over the threshold (default ₦100,000)', () => {
    const zone = LAGOS_ZONES[0]
    // Big orders: plenty of stock so stock never holds them
    beforeEach(async () => {
      await db.update(productStock).set({ units: 5000 })
    })
    const lagos = (ref: string, items: ClaimedItem[], amountNaira: number, extra: Record<string, unknown> = {}) => {
      const c = charge(ref, items, amountNaira, extra)
      const meta = c.metadata as { customer_details: Record<string, string> }
      meta.customer_details = { ...meta.customer_details, state: 'Lagos', lga: zone.areas[0] }
      return c
    }

    it('charges no delivery once the items reach ₦100,000', async () => {
      const r = await recordPaidOrder(lagos('tw-f1', [gold({ tierQty: 100, unitPrice: 28000, quantity: 4 })], 112000))
      expect(r).toMatchObject({ status: 'paid', paymentIssue: null })
      expect((await db.select().from(orders))[0]).toMatchObject({ subtotal: 112000, shippingCost: 0, total: 112000 })
    })

    it('still charges delivery below it, and a promo that takes the items under it counts', async () => {
      expect((await recordPaidOrder(lagos('tw-f2', [gold({ tierQty: 100, unitPrice: 28000, quantity: 3 })], 84000 + zone.defaultFee)))?.status).toBe('paid')
      await db.insert(promoCodes).values({ code: 'TEN', discountType: 'percentage', discountValue: 10 })
      // ₦112,000 - 10% = ₦100,800: still over, so free
      expect((await recordPaidOrder(lagos('tw-f3', [gold({ tierQty: 100, unitPrice: 28000, quantity: 4 })], 100800, { promo_code: 'TEN' })))?.status).toBe('paid')
      // ₦99,000 - 10% = ₦89,100: under, so delivery is charged and paying without it is held
      const items = [gold({ tierQty: 100, unitPrice: 28000, quantity: 3 }), gold({ unitPrice: 15000, quantity: 1, threadColour: 'red' })]
      expect((await recordPaidOrder(lagos('tw-f4', items, 89100, { promo_code: 'TEN' })))?.status).toBe('payment_review')
      expect((await recordPaidOrder(lagos('tw-f5', items, 89100 + zone.defaultFee, { promo_code: 'TEN' })))?.status).toBe('paid')
    })

    it('can be switched off in Admin → Shipping', async () => {
      await db.insert(settings).values({ key: 'shipping_free_lagos_over', value: '0' })
      const r = await recordPaidOrder(lagos('tw-f6', [gold({ tierQty: 100, unitPrice: 28000, quantity: 4 })], 112000))
      expect(r?.status).toBe('payment_review')
    })
  })
})
