import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

// Real Postgres (PGlite) and the real recordPaidOrder: the "send once" rule rests on
// its created flag. Emails are out of scope here; after() runs when the test says.
const { afterCalls } = vi.hoisted(() => ({ afterCalls: [] as (() => unknown)[] }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => afterCalls.push(fn) }))
vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/paystack/forwardSubscriptionEvent', () => ({ forwardSubscriptionEvent: vi.fn() }))
vi.mock('@/lib/notifications/notificationState', () => ({
  getAdminNotificationEmail: vi.fn(async () => 'admin@example.com'),
  // Already sent: the webhook stops before any email work
  ensureOrderNotification: vi.fn(async () => ({ id: 'n1', status: 'sent', attempts: 1 })),
  claimOrderNotificationSend: vi.fn(),
  markOrderNotificationSent: vi.fn(),
  markOrderNotificationFailed: vi.fn(),
}))

import { db, resetDb, products, productStock, orders } from '../../helpers/pgliteDb'
import { POST as webhook } from '@/app/api/webhooks/paystack/route'
import { GET as verify } from '@/app/api/paystack/verify/[reference]/route'
import { TIKTOK_EVENTS_URL } from '@/lib/tracking/server'

const SECRET = 'sk_test_secret'
const GOLD = '11111111-1111-1111-1111-111111111111'

/** A ₦15,000 pack of beads to Abuja (₦4,500 delivery) */
function chargeData(reference: string, extraMeta: Record<string, unknown> = {}, amountNaira = 19500) {
  return {
    reference,
    status: 'success',
    amount: amountNaira * 100,
    currency: 'NGN',
    customer: { email: 'Ada@Example.com' },
    ip_address: '102.89.1.1',
    metadata: {
      cart_items: [
        { productId: GOLD, productName: 'Gold Twinkles', variantId: 'v4', variantName: '4mm', tierQty: 50, threadColour: 'black', unitPrice: 15000, quantity: 1, isTool: false },
      ],
      customer_details: { first_name: 'Ada', last_name: 'Obi', phone: '08031234567', delivery_address: '1 Allen', state: 'Abuja' },
      utm: { source: 'facebook', content: 'gold-video-1' },
      consent: 'granted',
      ad_match: { fbp: 'fb.1.1700.123', ttp: 'ttp-1', page_url: 'https://twinklelocs.com/checkout', user_agent: 'Checkout UA' },
      ...extraMeta,
    },
  }
}

function webhookRequest(data: ReturnType<typeof chargeData>) {
  const body = JSON.stringify({ event: 'charge.success', data })
  const signature = crypto.createHmac('sha512', SECRET).update(body).digest('hex')
  return new NextRequest('http://localhost/api/webhooks/paystack', { method: 'POST', body, headers: { 'x-paystack-signature': signature } })
}

let paystackVerifyData: ReturnType<typeof chargeData> | null = null
const fetchMock = vi.fn(async (url: string | URL | Request) => {
  const u = String(url)
  if (u.startsWith('https://api.paystack.co/transaction/verify/')) {
    return new Response(JSON.stringify({ status: true, data: paystackVerifyData }), { status: 200 })
  }
  if (u.includes('graph.facebook.com')) return new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
  if (u === TIKTOK_EVENTS_URL) return new Response(JSON.stringify({ code: 0, message: 'OK' }), { status: 200 })
  throw new Error('unexpected fetch ' + u)
})

const adCalls = () => fetchMock.mock.calls.filter(([u]) => !String(u).includes('api.paystack.co'))
const metaCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('graph.facebook.com'))
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string)

async function runAfter() {
  const fns = afterCalls.splice(0)
  for (const fn of fns) await fn()
}

function verifyRequest(reference: string) {
  return verify(new NextRequest(`http://localhost/api/paystack/verify/${reference}`), {
    params: Promise.resolve({ reference }),
  })
}

beforeEach(async () => {
  await resetDb()
  afterCalls.length = 0
  fetchMock.mockClear()
  paystackVerifyData = null
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubEnv('PAYSTACK_SECRET_KEY', SECRET)
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'C4ABCDEF1234567890')
  vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'meta-token')
  vi.stubEnv('TIKTOK_EVENTS_ACCESS_TOKEN', 'tiktok-token')
  await db.insert(products).values({
    id: GOLD,
    name: 'Gold Twinkles',
    slug: 'gold-twinkles',
    material: 'Gold',
    priceMin: 15000,
    priceMax: 15000,
    variants: [{ id: 'v4', name: '4mm', in_stock: true, price: 15000, price_tiers: [{ qty: 50, price: 15000 }] }],
  })
  await db.insert(productStock).values({ productId: GOLD, variantId: 'v4', units: 500 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('server-side Purchase from the payment routes', () => {
  it('webhook: sends once, after the response, even when Paystack retries and verify also runs', async () => {
    const data = chargeData('tw-100-aaaaa')
    const res = await webhook(webhookRequest(data))
    expect(res.status).toBe(200)
    expect(adCalls()).toHaveLength(0) // nothing before the response
    await runAfter()
    expect(metaCalls()).toHaveLength(1)
    expect(adCalls()).toHaveLength(2) // Meta + TikTok

    const metaBody = bodyOf(metaCalls()[0])
    expect(metaBody.data[0]).toMatchObject({
      event_name: 'Purchase',
      event_id: 'tw-100-aaaaa',
      custom_data: { value: 19500, currency: 'NGN', content_ids: [GOLD] },
    })
    expect(metaBody.data[0].user_data).toMatchObject({ client_ip_address: '102.89.1.1', client_user_agent: 'Checkout UA', fbp: 'fb.1.1700.123' })

    // Retry + the order page's verify call
    expect((await webhook(webhookRequest(data))).status).toBe(200)
    paystackVerifyData = data
    expect((await verifyRequest('tw-100-aaaaa')).status).toBe(200)
    await runAfter()
    expect(adCalls()).toHaveLength(2)
    expect(await db.$count(orders)).toBe(1)
  })

  it('verify first: sends once, from verify', async () => {
    const data = chargeData('tw-200-bbbbb')
    paystackVerifyData = data
    expect((await verifyRequest('tw-200-bbbbb')).status).toBe(200)
    expect((await webhook(webhookRequest(data))).status).toBe(200)
    await runAfter()
    expect(metaCalls()).toHaveLength(1)
    expect(adCalls()).toHaveLength(2)
    expect(bodyOf(metaCalls()[0]).data[0]).toMatchObject({ event_id: 'tw-200-bbbbb', user_data: { client_user_agent: 'Checkout UA' } })
  })

  it('sends nothing when the buyer declined ad cookies', async () => {
    await webhook(webhookRequest(chargeData('tw-300-ccccc', { consent: 'denied' })))
    await runAfter()
    expect(adCalls()).toHaveLength(0)
    expect(await db.$count(orders)).toBe(1)
  })

  it('sends nothing for an order held for payment review', async () => {
    await webhook(webhookRequest(chargeData('tw-400-ddddd', {}, 1000))) // charged far too little
    await runAfter()
    expect(adCalls()).toHaveLength(0)
  })

  it('a failing ad platform never affects the order or the response', async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('Meta down')
    })
    const res = await webhook(webhookRequest(chargeData('tw-500-eeeee')))
    expect(res.status).toBe(200)
    await expect(runAfter()).resolves.toBeUndefined()
    expect(await db.$count(orders)).toBe(1)
  })
})
