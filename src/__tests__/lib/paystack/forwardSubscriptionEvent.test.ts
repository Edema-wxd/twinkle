import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  forwardSubscriptionEvent,
  isSubscriptionEvent,
} from '@/lib/paystack/forwardSubscriptionEvent'

/**
 * This module sits in a live payment path, so the tests care about two
 * failures in opposite directions: forwarding a Twinkle Locs order to QRiate+
 * (noise that buries real problems), and NOT forwarding a QRiate+ subscription
 * event (a customer pays and never gets their plan).
 */

/** A store order: cart metadata, and `plan: []` as Paystack sends it. */
const storeCharge = {
  event: 'charge.success',
  data: {
    reference: 'TWK_123',
    plan: [],
    metadata: {
      cart_items: [{ productId: 'p1', quantity: 1 }],
      customer_details: { first_name: 'A', last_name: 'B' },
    },
  },
}

/** A QRiate+ renewal: a plan code and no cart. */
const subscriptionCharge = {
  event: 'charge.success',
  data: {
    reference: 'QR_456',
    plan: { plan_code: 'PLN_pro' },
    metadata: { user_id: 'f0e1d2c3' },
  },
}

describe('isSubscriptionEvent', () => {
  it('does not claim a Twinkle Locs order', () => {
    expect(isSubscriptionEvent(storeCharge)).toBe(false)
  })

  it('claims a charge carrying a plan', () => {
    expect(isSubscriptionEvent(subscriptionCharge)).toBe(true)
  })

  it('claims a charge carrying only QRiate+ metadata', () => {
    expect(
      isSubscriptionEvent({
        event: 'charge.success',
        data: { plan: [], metadata: { user_id: 'abc' } },
      })
    ).toBe(true)
  })

  it('claims every subscription and invoice event', () => {
    for (const event of [
      'subscription.create',
      'subscription.not_renew',
      'subscription.disable',
      'invoice.payment_failed',
      'invoice.create',
    ]) {
      expect(isSubscriptionEvent({ event })).toBe(true)
    }
  })

  it('ignores events neither app acts on', () => {
    expect(isSubscriptionEvent({ event: 'customeridentification.success' })).toBe(false)
    expect(isSubscriptionEvent({ event: 'transfer.success' })).toBe(false)
  })

  it('treats a malformed payload as not ours', () => {
    expect(isSubscriptionEvent({})).toBe(false)
    expect(isSubscriptionEvent({ event: 'charge.success' })).toBe(false)
  })
})

describe('forwardSubscriptionEvent', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('QRIATE_WEBHOOK_URL', 'https://qriateplus.com/api/paystack/webhook')
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sends the raw body and the original signature unchanged', async () => {
    const raw = '{"event":"subscription.create",  "data":{"id":1}}'
    await forwardSubscriptionEvent(raw, 'sig-abc', JSON.parse(raw))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    // Byte-for-byte: QRiate+ verifies the same HMAC over this exact string, so
    // re-serialising it here would break a valid signature.
    expect(init.body).toBe(raw)
    expect(init.headers['x-paystack-signature']).toBe('sig-abc')
  })

  it('does not call out at all for a store order', async () => {
    await forwardSubscriptionEvent(JSON.stringify(storeCharge), 'sig', storeCharge)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does nothing when the target is not configured', async () => {
    vi.stubEnv('QRIATE_WEBHOOK_URL', '')
    await forwardSubscriptionEvent('{}', 'sig', { event: 'subscription.create' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * The rule that protects the store. Twinkle Locs answers Paystack before
   * this runs, but a rejection here must still not become an exception that
   * surfaces anywhere.
   */
  it('swallows a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(
      forwardSubscriptionEvent('{}', 'sig', { event: 'subscription.create' })
    ).resolves.toBeUndefined()
  })

  it('swallows a non-2xx from QRiate+ but logs it loudly', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })
    await expect(
      forwardSubscriptionEvent('{}', 'sig', { event: 'invoice.payment_failed' })
    ).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
