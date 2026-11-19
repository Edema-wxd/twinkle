import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import type { RecordedOrder } from '@/lib/payments/paidOrder'
import {
  META_GRAPH_VERSION,
  TIKTOK_EVENTS_URL,
  buildMetaPurchase,
  buildTikTokPurchase,
  normalizeEmail,
  normalizePhone,
  purchaseFromOrder,
  reportPurchaseIfNew,
  sendServerPurchase,
  sha256,
  shouldSendServerPurchase,
  type ServerPurchase,
} from '@/lib/tracking/server'

const META_ID = '123456789012345'
const TIKTOK_ID = 'C4ABCDEF1234567890'
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex')

const recorded = (over: Partial<RecordedOrder> = {}): RecordedOrder => ({
  orderId: 'o1',
  created: true,
  status: 'paid',
  paymentIssue: null,
  customerName: 'Ada Obi',
  customerEmail: 'ada@example.com',
  customerPhone: '0803 123 4567',
  deliveryState: 'Lagos',
  totalNaira: 33500,
  amountPaidNaira: 33500,
  emailItems: [],
  ...over,
})

const metadata = (consent: string | undefined, adMatch?: Record<string, unknown>) => ({
  cart_items: [
    { productId: 'p-gold', variantId: 'v4', quantity: 1, unitPrice: 15000 },
    { productId: 'p-gold', variantId: 'v4', threadColour: 'red', quantity: 1, unitPrice: 15000 },
    { productId: 'p-shears', variantId: 's1', quantity: 1, unitPrice: 3500 },
  ],
  customer_details: { first_name: 'Ada', last_name: 'Obi', phone: '0803 123 4567', delivery_address: '1 Allen', state: 'Lagos' },
  utm: { source: 'facebook', content: 'gold-video-1' },
  ...(consent ? { consent } : {}),
  ...(adMatch ? { ad_match: adMatch } : {}),
})

const MATCH = {
  fbp: 'fb.1.1700000000000.123',
  fbc: 'fb.1.1700000000000.IwAR123',
  ttp: 'ttp-cookie-value',
  ttclid: 'E.C.P.abc',
  page_url: 'https://twinklelocs.com/checkout',
  user_agent: 'Mozilla/5.0 (iPhone)',
}

const charge = (meta: unknown) => ({ reference: 'tw-1700-abcde', metadata: meta, ipAddress: '102.89.1.1' })

function okFetch() {
  return vi.fn<typeof fetch>(async (url) => {
    const u = String(url)
    const body = u.includes('graph.facebook.com') ? { events_received: 1, fbtrace_id: 'x' } : { code: 0, message: 'OK' }
    return new Response(JSON.stringify(body), { status: 200 })
  })
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', META_ID)
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', TIKTOK_ID)
  vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'meta-token')
  vi.stubEnv('TIKTOK_EVENTS_ACCESS_TOKEN', 'tiktok-token')
  vi.stubEnv('META_TEST_EVENT_CODE', '')
  vi.stubEnv('TIKTOK_TEST_EVENT_CODE', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('normalising before hashing', () => {
  it('lowercases and trims email', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com')
    expect(normalizeEmail('not an email')).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
  })

  it('writes Nigerian phone numbers with the 234 country code, digits only', () => {
    expect(normalizePhone('0803 123 4567')).toBe('2348031234567')
    expect(normalizePhone('+234 803-123-4567')).toBe('2348031234567')
    expect(normalizePhone('2340803 123 4567')).toBe('2348031234567')
    expect(normalizePhone('803 123 4567')).toBe('2348031234567')
    expect(normalizePhone('+44 7700 900123')).toBe('447700900123')
    expect(normalizePhone('12')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })

  it('hashes with SHA-256 hex', () => {
    expect(sha256('ada@example.com')).toBe(hash('ada@example.com'))
    expect(sha256('x')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('when to send', () => {
  it('sends only for a paid order this call just created', () => {
    expect(shouldSendServerPurchase(recorded())).toBe(true)
    expect(shouldSendServerPurchase(recorded({ created: false }))).toBe(false) // webhook retry, or verify after webhook
    expect(shouldSendServerPurchase(recorded({ status: 'payment_review' }))).toBe(false)
    expect(shouldSendServerPurchase(null)).toBe(false)
  })
})

describe('payloads', () => {
  const purchase = (): ServerPurchase => ({ ...purchaseFromOrder(recorded(), charge(metadata('granted', MATCH))), eventTime: 1700000000 })

  it('builds the purchase from the order and its cart lines', () => {
    const p = purchaseFromOrder(recorded(), charge(metadata('granted')))
    expect(p).toMatchObject({
      reference: 'tw-1700-abcde',
      value: 33500,
      email: 'ada@example.com',
      phone: '0803 123 4567',
      ipAddress: '102.89.1.1',
      contents: [
        { id: 'p-gold', quantity: 2, price: 15000 },
        { id: 'p-shears', quantity: 1, price: 3500 },
      ],
    })
  })

  it('Meta: Purchase with the reference as event_id, hashed user data and the pixel cookies', () => {
    const body = buildMetaPurchase(purchase(), MATCH, 'TEST123')
    expect(body.test_event_code).toBe('TEST123')
    const [event] = body.data!
    expect(event).toMatchObject({
      event_name: 'Purchase',
      event_time: 1700000000,
      event_id: 'tw-1700-abcde',
      action_source: 'website',
      event_source_url: 'https://twinklelocs.com/checkout',
      custom_data: {
        currency: 'NGN',
        value: 33500,
        content_ids: ['p-gold', 'p-shears'],
        content_type: 'product',
        contents: [
          { id: 'p-gold', quantity: 2, item_price: 15000 },
          { id: 'p-shears', quantity: 1, item_price: 3500 },
        ],
        num_items: 3,
        order_id: 'tw-1700-abcde',
      },
    })
    expect(event.user_data).toEqual({
      em: [hash('ada@example.com')],
      ph: [hash('2348031234567')],
      country: [hash('ng')],
      client_ip_address: '102.89.1.1',
      client_user_agent: 'Mozilla/5.0 (iPhone)',
      fbp: MATCH.fbp,
      fbc: MATCH.fbc,
    })
    // No raw personal data leaves us
    const text = JSON.stringify(body)
    for (const raw of ['ada@example.com', '0803', '2348031234567', 'Ada', 'Obi', 'Lagos', 'Allen']) expect(text).not.toContain(raw)
  })

  it('TikTok: CompletePayment with hashed E.164 phone, ttp and the click id', () => {
    const body = buildTikTokPurchase(purchase(), MATCH, TIKTOK_ID, 'TEST456')
    expect(body).toMatchObject({ event_source: 'web', event_source_id: TIKTOK_ID, test_event_code: 'TEST456' })
    const [event] = body.data!
    expect(event).toEqual({
      event: 'CompletePayment',
      event_time: 1700000000,
      event_id: 'tw-1700-abcde',
      user: {
        email: hash('ada@example.com'),
        phone: hash('+2348031234567'),
        ttp: MATCH.ttp,
        ttclid: MATCH.ttclid,
        ip: '102.89.1.1',
        user_agent: 'Mozilla/5.0 (iPhone)',
      },
      properties: {
        currency: 'NGN',
        value: 33500,
        content_type: 'product',
        contents: [
          { content_id: 'p-gold', quantity: 2, price: 15000 },
          { content_id: 'p-shears', quantity: 1, price: 3500 },
        ],
        order_id: 'tw-1700-abcde',
      },
      page: { url: 'https://twinklelocs.com/checkout' },
    })
  })

  it('falls back to the order page URL and leaves out a test code that is not set', () => {
    const p = purchaseFromOrder(recorded(), charge(metadata('granted')))
    const body = buildMetaPurchase(p, {}, null)
    expect(body).not.toHaveProperty('test_event_code')
    expect(body.data![0].event_source_url).toBe('https://twinklelocs.com/orders/tw-1700-abcde')
    expect(body.data![0].user_data).not.toHaveProperty('fbp')
  })
})

describe('sendServerPurchase', () => {
  it('sends to both platforms when the buyer accepted', async () => {
    const fetchMock = okFetch()
    vi.stubEnv('META_TEST_EVENT_CODE', 'TEST123')
    const result = await sendServerPurchase(purchaseFromOrder(recorded(), charge(metadata('granted', MATCH))), { fetch: fetchMock })
    expect(result).toEqual({ meta: 'sent', tiktok: 'sent' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const metaCall = fetchMock.mock.calls.find(([u]) => String(u).includes('graph.facebook.com'))!
    expect(String(metaCall[0])).toBe(`https://graph.facebook.com/${META_GRAPH_VERSION}/${META_ID}/events?access_token=meta-token`)
    const metaBody = JSON.parse((metaCall[1] as RequestInit).body as string)
    expect(metaBody.test_event_code).toBe('TEST123')
    expect(metaBody.data[0].event_id).toBe('tw-1700-abcde')

    const ttCall = fetchMock.mock.calls.find(([u]) => String(u) === TIKTOK_EVENTS_URL)!
    const init = ttCall[1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Access-Token']).toBe('tiktok-token')
    const ttBody = JSON.parse(init.body as string)
    expect(ttBody).not.toHaveProperty('test_event_code')
    expect(ttBody.data[0]).toMatchObject({ event: 'CompletePayment', event_id: 'tw-1700-abcde' })
  })

  it('sends nothing when the buyer declined or never answered', async () => {
    for (const consent of ['denied', 'pending', undefined]) {
      const fetchMock = okFetch()
      const result = await sendServerPurchase(purchaseFromOrder(recorded(), charge(metadata(consent, MATCH))), { fetch: fetchMock })
      expect(result).toEqual({ meta: 'skipped', tiktok: 'skipped' })
      expect(fetchMock).not.toHaveBeenCalled()
    }
  })

  it('skips a platform without its token or pixel id', async () => {
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    const fetchMock = okFetch()
    const result = await sendServerPurchase(purchaseFromOrder(recorded(), charge(metadata('granted'))), { fetch: fetchMock })
    expect(result).toEqual({ meta: 'skipped', tiktok: 'skipped' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs and carries on when a platform rejects the event or is unreachable', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      if (String(url).includes('graph.facebook.com')) throw new Error('network down')
      return new Response(JSON.stringify({ code: 40001, message: 'Invalid access token' }), { status: 200 })
    })
    const result = await sendServerPurchase(purchaseFromOrder(recorded(), charge(metadata('granted'))), { fetch: fetchMock })
    expect(result).toEqual({ meta: 'failed', tiktok: 'failed' })
    expect(console.error).toHaveBeenCalledTimes(2)
    // Tokens never end up in the logs
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('meta-token')
  })

  it('reads metadata saved as a JSON string', async () => {
    const fetchMock = okFetch()
    const result = await sendServerPurchase(
      purchaseFromOrder(recorded(), charge(JSON.stringify(metadata('granted', MATCH)))),
      { fetch: fetchMock },
    )
    expect(result).toEqual({ meta: 'sent', tiktok: 'sent' })
  })
})

describe('reportPurchaseIfNew', () => {
  it('sends once for a new paid order, never for a repeat', async () => {
    const fetchMock = okFetch()
    await reportPurchaseIfNew(recorded(), charge(metadata('granted')), { fetch: fetchMock })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await reportPurchaseIfNew(recorded({ created: false }), charge(metadata('granted')), { fetch: fetchMock })
    await reportPurchaseIfNew(null, charge(metadata('granted')), { fetch: fetchMock })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
