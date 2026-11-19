// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/tracking/events', async (orig) => ({ ...(await orig<typeof import('@/lib/tracking/events')>()), trackEvent }))

import { PurchaseTracker, purchaseEventFor } from '@/app/orders/[reference]/PurchaseTracker'
import { setConsent } from '@/lib/tracking/consent'
import type { PublicOrder } from '@/lib/orders/publicOrder'

const order = (over: Partial<PublicOrder> = {}): PublicOrder => ({
  reference: 'tw-1700-abcde',
  status: 'paid',
  created_at: new Date().toISOString(),
  customer_name: 'Ada Obi',
  delivery_address: '1 Allen',
  delivery_state: 'Lagos',
  delivery_area: null,
  delivery_estimate: '',
  tracking_number: null,
  subtotal: 33500,
  shipping_cost: 0,
  discount: 0,
  total: 33500,
  items: [
    { id: 'i1', product_id: 'p-gold', product_name: 'Gold', variant_name: '4mm', tier_qty: 50, thread_colour: 'black', quantity: 1, line_total: 15000 },
    { id: 'i2', product_id: 'p-gold', product_name: 'Gold', variant_name: '4mm', tier_qty: 50, thread_colour: 'red', quantity: 1, line_total: 15000 },
    { id: 'i3', product_id: 'p-shears', product_name: 'Shears', variant_name: 'Standard', tier_qty: 1, thread_colour: null, quantity: 1, line_total: 3500 },
  ],
  ...over,
})

function clearCookies() {
  for (const c of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${c.split('=')[0]}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
  trackEvent.mockClear()
  localStorage.clear()
})

afterEach(() => {
  clearCookies()
  vi.unstubAllEnvs()
})

describe('browser Purchase on the order page', () => {
  it('builds the event from the order, with product ids as content ids', () => {
    expect(purchaseEventFor(order())).toEqual({
      name: 'Purchase',
      contentIds: ['p-gold', 'p-shears'],
      contents: [
        { id: 'p-gold', quantity: 2, price: 15000 },
        { id: 'p-shears', quantity: 1, price: 3500 },
      ],
      value: 33500,
      numItems: 3,
      orderId: 'tw-1700-abcde',
    })
  })

  it('fires once with the reference as event id, not again on refresh', () => {
    setConsent('granted')
    const { unmount } = render(<PurchaseTracker order={order()} />)
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'Purchase', value: 33500 }), { eventId: 'tw-1700-abcde' })
    unmount()
    render(<PurchaseTracker order={order()} />)
    expect(trackEvent).toHaveBeenCalledTimes(1)
  })

  it('waits for consent, and fires if the buyer accepts on the page', () => {
    render(<PurchaseTracker order={order()} />)
    expect(trackEvent).not.toHaveBeenCalled()
    act(() => setConsent('granted'))
    expect(trackEvent).toHaveBeenCalledTimes(1)
  })

  it('does not fire after a decline, for orders under review, or for old orders', () => {
    setConsent('denied')
    render(<PurchaseTracker order={order()} />).unmount()
    setConsent('granted')
    render(<PurchaseTracker order={order({ reference: 'tw-2', status: 'payment_review' })} />)
    render(<PurchaseTracker order={order({ reference: 'tw-3', created_at: new Date(Date.now() - 3 * 86400_000).toISOString() })} />)
    render(<PurchaseTracker order={order({ reference: 'tw-4', status: 'shipped' })} />)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('still works when localStorage is blocked', () => {
    setConsent('granted')
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => render(<PurchaseTracker order={order()} />)).not.toThrow()
    expect(trackEvent).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    vi.restoreAllMocks()
  })
})
