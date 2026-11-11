import { describe, it, expect, vi, beforeEach } from 'vitest'

const { state } = vi.hoisted(() => ({ state: { row: null as Record<string, unknown> | null } }))

vi.mock('@/db', () => ({
  db: { query: { orders: { findFirst: vi.fn(async () => state.row) } } },
  orders: { paystackReference: 'paystack_reference' },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/lib/checkout/shippingInfo', () => ({
  getShippingInfo: vi.fn(async () => ({})),
  deliveryEstimateForOrder: vi.fn(() => '1–2 hrs after dispatch (Lekki Corridor, Lagos)'),
}))

import { getPublicOrder } from '@/lib/orders/publicOrder'

const baseRow = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  paystackReference: 'tw-1-abcde',
  status: 'paid',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  customerName: 'Ada Obi',
  customerEmail: 'ada@example.com',
  customerPhone: '08031234567',
  customerIp: '102.89.1.1',
  deliveryAddress: '12 Allen Avenue',
  deliveryState: 'Lagos',
  paystackPayload: { authorization: { bank: 'GTBank', last4: '4081' }, customer: { email: 'ada@example.com' }, ip_address: '102.89.1.1' },
  trackingNumber: 'GIG123',
  subtotal: 30000,
  shippingCost: 3000,
  total: 33000,
  discountAmount: 0,
  orderItems: [{ id: 'i1', productName: 'Gold Twinkles', variantName: '4mm', tierQty: 50, threadColour: 'black', quantity: 2, lineTotal: 30000 }],
  ...over,
})

beforeEach(() => {
  state.row = baseRow()
})

describe('getPublicOrder', () => {
  it('never exposes the payment record, email, phone or IP to the order page', async () => {
    const order = await getPublicOrder('tw-1-abcde')
    const text = JSON.stringify(order)
    for (const secret of ['ada@example.com', '08031234567', '102.89.1.1', '4081', 'GTBank', 'paystack_payload', 'authorization']) {
      expect(text).not.toContain(secret)
    }
    expect(order).toMatchObject({ reference: 'tw-1-abcde', customer_name: 'Ada Obi', delivery_address: '12 Allen Avenue', total: 33000 })
  })

  it('works out the promo discount from the totals', async () => {
    state.row = baseRow({ total: 30000, discountAmount: 3000 })
    expect((await getPublicOrder('tw-1-abcde'))?.discount).toBe(3000)
    state.row = baseRow({ total: 30000 }) // older orders without the stored amount
    expect((await getPublicOrder('tw-1-abcde'))?.discount).toBe(3000)
    state.row = baseRow()
    expect((await getPublicOrder('tw-1-abcde'))?.discount).toBe(0)
  })

  it('only shows the tracking number once the order has shipped', async () => {
    expect((await getPublicOrder('tw-1-abcde'))?.tracking_number).toBeNull()
    state.row = baseRow({ status: 'shipped' })
    expect((await getPublicOrder('tw-1-abcde'))?.tracking_number).toBe('GIG123')
  })

  it('returns null for unknown or absurd references', async () => {
    state.row = null
    expect(await getPublicOrder('tw-unknown')).toBeNull()
    expect(await getPublicOrder('x'.repeat(500))).toBeNull()
  })
})
