// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { setConsent } from '@/lib/tracking/consent'
import { mapEvent, trackEvent } from '@/lib/tracking/events'
import { META_SCRIPT, TIKTOK_SCRIPT, loadPixels, resetPixelsForTests, trackPageView } from '@/lib/tracking/pixels'

const META_ID = '123456789012345'
const TIKTOK_ID = 'C4ABCDEF1234567890'

function clearCookies() {
  for (const c of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${c.split('=')[0]}=; Path=/; Max-Age=0`
  }
}

let fbq: ReturnType<typeof vi.fn> & Record<string, unknown>
let ttq: { track: ReturnType<typeof vi.fn>; page: ReturnType<typeof vi.fn>; load: ReturnType<typeof vi.fn> }

function mockPixels() {
  fbq = vi.fn() as typeof fbq
  ttq = { track: vi.fn(), page: vi.fn(), load: vi.fn() }
  window.fbq = fbq as unknown as Window['fbq']
  window.ttq = ttq as unknown as Window['ttq']
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', META_ID)
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', TIKTOK_ID)
  resetPixelsForTests()
})

afterEach(() => {
  clearCookies()
  vi.unstubAllEnvs()
  delete window.fbq
  delete window._fbq
  delete window.ttq
  document.head.querySelectorAll('script').forEach((s) => s.remove())
})

describe('event mapping', () => {
  it('maps Purchase to Meta Purchase and TikTok CompletePayment in NGN', () => {
    const { meta, tiktok } = mapEvent({
      name: 'Purchase',
      contentIds: ['p1', 'p2'],
      contents: [
        { id: 'p1', quantity: 2, price: 15000 },
        { id: 'p2', quantity: 1, price: 3500 },
      ],
      value: 33500,
      numItems: 3,
      orderId: 'tw-1-abc',
    })
    expect(meta).toEqual({
      name: 'Purchase',
      custom: false,
      params: {
        content_ids: ['p1', 'p2'],
        content_type: 'product',
        contents: [
          { id: 'p1', quantity: 2, item_price: 15000 },
          { id: 'p2', quantity: 1, item_price: 3500 },
        ],
        value: 33500,
        currency: 'NGN',
        num_items: 3,
        order_id: 'tw-1-abc',
      },
    })
    expect(tiktok).toEqual({
      name: 'CompletePayment',
      params: {
        contents: [
          { content_id: 'p1', quantity: 2, price: 15000 },
          { content_id: 'p2', quantity: 1, price: 3500 },
        ],
        content_type: 'product',
        value: 33500,
        currency: 'NGN',
        order_id: 'tw-1-abc',
      },
    })
  })

  it('maps the other events to each platform’s names', () => {
    expect(mapEvent({ name: 'Lead', source: 'lp' })).toMatchObject({ meta: { name: 'Lead', params: { source: 'lp' } }, tiktok: { name: 'SubmitForm' } })
    expect(mapEvent({ name: 'Contact', location: 'fab' })).toMatchObject({ meta: { name: 'Contact', params: { location: 'fab' } }, tiktok: { name: 'Contact' } })
    expect(mapEvent({ name: 'InitiateCheckout', value: 30000, numItems: 2 })).toMatchObject({
      meta: { name: 'InitiateCheckout', params: { value: 30000, currency: 'NGN', num_items: 2 } },
      tiktok: { name: 'InitiateCheckout', params: { value: 30000, currency: 'NGN' } },
    })
    expect(mapEvent({ name: 'SelectVariant', productId: 'p1', size: '4mm', pack: 50 })).toMatchObject({
      meta: { name: 'SelectVariant', custom: true, params: { content_ids: ['p1'], size: '4mm', pack: 50 } },
      tiktok: { name: 'SelectVariant', params: { contents: [{ content_id: 'p1' }], size: '4mm', pack: 50 } },
    })
    const view = mapEvent({ name: 'ViewContent', contentIds: ['a', 'b', 'c'] })
    expect(view.meta.params).toEqual({ content_ids: ['a', 'b', 'c'], content_type: 'product', currency: 'NGN' })
    expect(view.tiktok.params).toEqual({ contents: [{ content_id: 'a' }, { content_id: 'b' }, { content_id: 'c' }], content_type: 'product', currency: 'NGN' })
  })

  it('gives AddToCart a unit price for a single product', () => {
    const { meta, tiktok } = mapEvent({ name: 'AddToCart', contentIds: ['p1'], contentName: 'Gold Twinkles', value: 30000, quantity: 2 })
    expect(meta.params).toMatchObject({ content_ids: ['p1'], value: 30000, currency: 'NGN', contents: [{ id: 'p1', quantity: 2, item_price: 15000 }] })
    expect(tiktok.params).toMatchObject({
      contents: [{ content_id: 'p1', content_name: 'Gold Twinkles', quantity: 2, price: 15000 }],
      content_type: 'product',
      value: 30000,
      currency: 'NGN',
    })
  })
})

describe('trackEvent', () => {
  it('sends to both pixels with the event id once consent is granted', () => {
    mockPixels()
    setConsent('granted')
    trackEvent({ name: 'AddToCart', contentIds: ['p1'], value: 15000, quantity: 1 }, { eventId: 'evt-1' })
    expect(fbq).toHaveBeenCalledWith('init', META_ID)
    expect(fbq).toHaveBeenCalledWith('track', 'AddToCart', expect.objectContaining({ content_ids: ['p1'], currency: 'NGN' }), { eventID: 'evt-1' })
    expect(ttq.load).toHaveBeenCalledWith(TIKTOK_ID)
    expect(ttq.track).toHaveBeenCalledWith('AddToCart', expect.objectContaining({ content_type: 'product', currency: 'NGN' }), { event_id: 'evt-1' })
  })

  it('uses trackCustom for SelectVariant and leaves out the id when none is given', () => {
    mockPixels()
    setConsent('granted')
    trackEvent({ name: 'SelectVariant', productId: 'p1', size: '6mm', pack: 100 })
    expect(fbq).toHaveBeenCalledWith('trackCustom', 'SelectVariant', expect.objectContaining({ size: '6mm', pack: 100 }))
    expect(ttq.track).toHaveBeenCalledWith('SelectVariant', expect.objectContaining({ size: '6mm' }))
  })

  it('sends nothing while consent is pending or after a decline', () => {
    mockPixels()
    trackEvent({ name: 'Lead', source: 'lp' })
    setConsent('denied')
    trackEvent({ name: 'Lead', source: 'lp' })
    expect(fbq).not.toHaveBeenCalled()
    expect(ttq.track).not.toHaveBeenCalled()
  })

  it('sends only to the pixel that is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    mockPixels()
    setConsent('granted')
    trackEvent({ name: 'Contact', location: 'hero' })
    expect(fbq).toHaveBeenCalledWith('track', 'Contact', { location: 'hero' })
    expect(ttq.track).not.toHaveBeenCalled()
  })

  it('never throws, even when a pixel does', () => {
    mockPixels()
    fbq.mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setConsent('granted')
    expect(() => trackEvent({ name: 'Lead', source: 'lp' })).not.toThrow()
    expect(ttq.track).toHaveBeenCalledWith('SubmitForm', { source: 'lp' })
  })
})

describe('pixel loading', () => {
  it('adds no script before consent', () => {
    expect(loadPixels()).toBe(false)
    expect(document.querySelectorAll('script')).toHaveLength(0)
    expect(window.fbq).toBeUndefined()
  })

  it('injects the vendor scripts async, once, after consent', () => {
    setConsent('granted')
    expect(loadPixels()).toBe(true)
    loadPixels()
    const srcs = [...document.querySelectorAll('script')].map((s) => s.src)
    expect(srcs).toEqual([META_SCRIPT, `${TIKTOK_SCRIPT}?sdkid=${TIKTOK_ID}&lib=ttq`])
    expect([...document.querySelectorAll('script')].every((s) => s.async)).toBe(true)
    // The stubs queue calls until the vendor scripts arrive
    expect(window.fbq?.queue).toEqual([expect.objectContaining({ 0: 'init', 1: META_ID })])
    expect(window.fbq?.disablePushState).toBe(true)
    expect(typeof window.ttq?.track).toBe('function')
  })

  it('sends one PageView per route', () => {
    mockPixels()
    setConsent('granted')
    trackPageView('/')
    trackPageView('/')
    trackPageView('/shop-twinkles')
    expect(fbq.mock.calls.filter((c) => c[1] === 'PageView')).toHaveLength(2)
    expect(ttq.page).toHaveBeenCalledTimes(2)
  })

  it('keeps the TikTok click id from the ad link, only with consent', () => {
    window.history.replaceState(null, '', '/?ttclid=E.C.P.abc123')
    loadPixels()
    expect(document.cookie).not.toContain('tl_ttclid')
    mockPixels()
    setConsent('granted')
    loadPixels()
    expect(document.cookie).toContain('tl_ttclid=E.C.P.abc123')
    window.history.replaceState(null, '', '/')
  })
})
