import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Real Postgres: the order page must find an order whatever the case of the reference in its link.
vi.mock('@/db', () => import('../helpers/pgliteDb'))
vi.mock('@/lib/checkout/shippingInfo', () => ({ getShippingInfo: vi.fn(async () => ({})), deliveryEstimateForOrder: vi.fn(() => 'soon') }))

import { db, resetDb, orders } from '../helpers/pgliteDb'
import { getPublicOrder } from '@/lib/orders/publicOrder'
import { middleware } from '@/middleware'

const order = (paystackReference: string) => ({
  paystackReference,
  paystackPayload: {},
  customerName: 'Francis Woods',
  customerEmail: 'f@example.com',
  customerPhone: '0812',
  deliveryAddress: '22 General Ogumudia',
  deliveryState: 'Lagos',
  shippingCost: 3000,
  subtotal: 3500,
  total: 6500,
})

beforeEach(resetDb)

describe('order page reference', () => {
  it('finds an order with capitals in its reference, exactly or from a lowercased link', async () => {
    await db.insert(orders).values(order('T6773068772I1311053SZKZVM'))
    expect((await getPublicOrder('T6773068772I1311053SZKZVM'))?.reference).toBe('T6773068772I1311053SZKZVM')
    expect((await getPublicOrder('t6773068772i1311053szkzvm'))?.reference).toBe('T6773068772I1311053SZKZVM')
  })

  it('prefers the exact match, and refuses to guess between two', async () => {
    await db.insert(orders).values([order('tw-AbC'), order('tw-abc')])
    expect((await getPublicOrder('tw-AbC'))?.reference).toBe('tw-AbC')
    expect(await getPublicOrder('TW-ABC')).toBeNull()
  })

  it('the site no longer lowercases /orders/ links, but still tidies other pages', async () => {
    const run = (path: string) => middleware(new NextRequest(`https://twinklelocs.com${path}`))
    expect((await run('/orders/T6773068772I1311053SZKZVM')).status).toBe(200)
    const other = await run('/Catalog')
    expect(other.status).toBe(308)
    expect(other.headers.get('location')).toBe('https://twinklelocs.com/catalog')
  })
})
