import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db', () => import('../helpers/pgliteDb'))

import { db, resetDb, orders, orderItems } from '../helpers/pgliteDb'
import { popularChoice } from '@/lib/products/popularChoice'

const GOLD = '11111111-1111-1111-1111-111111111111'
let n = 0
async function sale(status: string, lines: { productId?: string; variantId: string; tierQty: number; threadColour: string | null; quantity: number }[]) {
  const [o] = await db
    .insert(orders)
    .values({ paystackReference: `tw-${++n}`, paystackPayload: {}, status, customerName: 'A', customerEmail: 'a@x.com', customerPhone: '0', deliveryAddress: 'x', deliveryState: 'Lagos', shippingCost: 0, subtotal: 1, total: 1 })
    .returning({ id: orders.id })
  await db.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, productId: l.productId ?? GOLD, productName: 'Gold', variantName: l.variantId, unitPrice: 1, lineTotal: 1, ...l })))
}

beforeEach(resetDb)

describe('popularChoice', () => {
  it('ranks this product’s packs and the overall thread colour by units sold, ignoring orders held for review', async () => {
    await sale('paid', [{ variantId: 'v4', tierQty: 50, threadColour: 'black', quantity: 1 }])
    await sale('delivered', [{ variantId: 'v6', tierQty: 100, threadColour: 'blonde', quantity: 2 }])
    await sale('shipped', [{ variantId: 'v6', tierQty: 100, threadColour: 'blonde', quantity: 1 }])
    await sale('payment_review', [{ variantId: 'v2', tierQty: 200, threadColour: 'red', quantity: 9 }])
    await sale('paid', [{ productId: '22222222-2222-2222-2222-222222222222', variantId: 's1', tierQty: 1, threadColour: null, quantity: 5 }])
    const p = await popularChoice(GOLD)
    expect(p.packs).toEqual([{ variantId: 'v6', tierQty: 100 }, { variantId: 'v4', tierQty: 50 }])
    expect(p.threadColour).toBe('blonde')
  })

  it('is empty before the first sale', async () => {
    expect(await popularChoice(GOLD)).toEqual({ packs: [], threadColour: null })
  })
})
