/**
 * Server-side Purchase events: Meta Conversions API and TikTok Events API.
 *
 * Browsers (iOS especially) block many pixel events, so each paid order is
 * also reported from the server. Both sides use the Paystack reference as the
 * event id, so Meta and TikTok count the purchase once when both arrive.
 *
 * Rules:
 * - Sent once per order: only by the call that newly recorded it (webhook or
 *   verify, whichever won), never on webhook retries. See shouldSendServerPurchase.
 * - Only for buyers who accepted ad cookies at checkout (metadata consent
 *   'granted'). A decline, or no answer, means nothing is sent.
 * - Each platform is on only when both its pixel id and its token are set.
 * - Only what matching needs: email and phone (normalised, SHA-256 hashed),
 *   IP address, browser user agent, the pixels' own ids and the country (ng).
 *   No names or delivery address.
 * - Never throws: failures are logged and the order is unaffected. Callers run
 *   it in after() so Paystack gets its answer first.
 */
import crypto from 'crypto'
import type { RecordedOrder } from '@/lib/payments/paidOrder'
import { metaPixelId, tiktokPixelId } from './config'
import { metadataObject, readAdContext, type AdMatch } from './adContext'

/** Meta Graph API version for /{pixel_id}/events (versions live about two years) */
export const META_GRAPH_VERSION = 'v24.0'
export const TIKTOK_EVENTS_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
const TIMEOUT_MS = 10_000
const CURRENCY = 'NGN'

export type ServerPurchaseContent = { id: string; quantity: number; price?: number }

export type ServerPurchase = {
  /** Paystack reference: the event id shared with the browser Purchase */
  reference: string
  /** Order total in Naira (the server's own figure) */
  value: number
  email: string
  phone: string
  ipAddress?: string | null
  contents: ServerPurchaseContent[]
  /** The Paystack metadata checkout sent (consent and ad match ids are read from it) */
  metadata: unknown
  /** Unix seconds; defaults to now */
  eventTime?: number
}

export type SendOutcome = 'sent' | 'skipped' | 'failed'

// ── Normalising and hashing ─────────────────────────────────────────────────

export const sha256 = (v: string) => crypto.createHash('sha256').update(v, 'utf8').digest('hex')

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}

/**
 * Digits only, with the country code and no leading zeros (Meta's format).
 * Nigerian numbers written locally ("0803 123 4567") get 234 added.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? '').trim()
  let d = raw.replace(/\D/g, '')
  if (!d) return null
  if (raw.startsWith('+') || raw.startsWith('00')) d = d.replace(/^00/, '')
  else if (d.startsWith('234')) d = '234' + d.slice(3).replace(/^0+/, '')
  else if (d.startsWith('0') && d.length === 11) d = '234' + d.slice(1)
  else if (d.length === 10) d = '234' + d
  d = d.replace(/^0+/, '')
  return d.length >= 8 && d.length <= 15 ? d : null
}

// ── Deciding ────────────────────────────────────────────────────────────────

/**
 * Only the call that newly recorded a paid order sends the server Purchase.
 * Retries and the second of webhook/verify get created: false. Orders held for
 * review aren't counted (the browser Purchase follows the same rule).
 */
export function shouldSendServerPurchase(recorded: Pick<RecordedOrder, 'created' | 'status'> | null | undefined): boolean {
  return !!recorded && recorded.created === true && recorded.status === 'paid'
}

/** Build the event input from what recordPaidOrder returned and the Paystack charge */
export function purchaseFromOrder(
  recorded: RecordedOrder,
  charge: { reference: string; metadata: unknown; ipAddress?: string | null },
): ServerPurchase {
  const m = metadataObject(charge.metadata)
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

  // Content ids and quantities from the cart lines (prices are only informational: value is the server's total)
  const byId = new Map<string, { quantity: number; prices: Set<number> }>()
  for (const line of Array.isArray(m?.cart_items) ? m.cart_items : []) {
    const l = metadataObject(line)
    const id = str(l?.productId)
    const qty = typeof l?.quantity === 'number' && Number.isFinite(l.quantity) ? Math.max(1, Math.trunc(l.quantity)) : 1
    if (!id) continue
    const entry = byId.get(id) ?? { quantity: 0, prices: new Set<number>() }
    entry.quantity += qty
    if (typeof l?.unitPrice === 'number' && Number.isFinite(l.unitPrice)) entry.prices.add(l.unitPrice)
    byId.set(id, entry)
  }
  const contents = [...byId].map(([id, e]) => ({ id, quantity: e.quantity, ...(e.prices.size === 1 ? { price: [...e.prices][0] } : {}) }))

  return {
    reference: charge.reference,
    value: recorded.totalNaira,
    email: recorded.customerEmail,
    phone: recorded.customerPhone,
    ipAddress: charge.ipAddress ?? null,
    contents,
    metadata: charge.metadata,
  }
}

// ── Payloads ────────────────────────────────────────────────────────────────

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/+$/, '')
}

function eventSourceUrl(p: ServerPurchase, match: AdMatch): string {
  return match.page_url ?? `${siteUrl()}/orders/${encodeURIComponent(p.reference)}`
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>
}

const numItems = (p: ServerPurchase) => p.contents.reduce((s, c) => s + c.quantity, 0)

/** Meta Conversions API body for POST /{pixel_id}/events */
export function buildMetaPurchase(p: ServerPurchase, match: AdMatch, testEventCode?: string | null) {
  const hashed = (v: string | null) => (v ? [sha256(v)] : undefined)
  return compact({
    data: [
      {
        event_name: 'Purchase',
        event_time: p.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: p.reference,
        action_source: 'website',
        event_source_url: eventSourceUrl(p, match),
        user_data: compact({
          em: hashed(normalizeEmail(p.email)),
          ph: hashed(normalizePhone(p.phone)),
          country: [sha256('ng')],
          client_ip_address: p.ipAddress ?? undefined,
          client_user_agent: match.user_agent,
          fbp: match.fbp,
          fbc: match.fbc,
        }),
        custom_data: {
          currency: CURRENCY,
          value: p.value,
          content_ids: p.contents.map((c) => c.id),
          content_type: 'product',
          contents: p.contents.map((c) => compact({ id: c.id, quantity: c.quantity, item_price: c.price })),
          num_items: numItems(p),
          order_id: p.reference,
        },
      },
    ],
    test_event_code: testEventCode || undefined,
  })
}

/** TikTok Events API 2.0 body for POST /open_api/v1.3/event/track/ */
export function buildTikTokPurchase(p: ServerPurchase, match: AdMatch, pixelId: string, testEventCode?: string | null) {
  const email = normalizeEmail(p.email)
  const phone = normalizePhone(p.phone)
  return compact({
    event_source: 'web',
    event_source_id: pixelId,
    test_event_code: testEventCode || undefined,
    data: [
      {
        event: 'CompletePayment',
        event_time: p.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: p.reference,
        user: compact({
          email: email ? sha256(email) : undefined,
          // TikTok wants E.164 (with the +) before hashing
          phone: phone ? sha256('+' + phone) : undefined,
          ttp: match.ttp,
          ttclid: match.ttclid,
          ip: p.ipAddress ?? undefined,
          user_agent: match.user_agent,
        }),
        properties: {
          currency: CURRENCY,
          value: p.value,
          content_type: 'product',
          contents: p.contents.map((c) => compact({ content_id: c.id, quantity: c.quantity, price: c.price })),
          order_id: p.reference,
        },
        page: { url: eventSourceUrl(p, match) },
      },
    ],
  })
}

// ── Sending ─────────────────────────────────────────────────────────────────

type Deps = { fetch?: typeof fetch }

const env = (name: string) => process.env[name]?.trim() || null

async function postJson(
  fetchFn: typeof fetch,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  const text = await res.text().catch(() => '')
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    /* not JSON */
  }
  return { ok: res.ok, status: res.status, json, text }
}

async function sendMeta(p: ServerPurchase, match: AdMatch, fetchFn: typeof fetch): Promise<SendOutcome> {
  const pixelId = metaPixelId()
  const token = env('META_CAPI_ACCESS_TOKEN')
  if (!pixelId || !token) return 'skipped'
  try {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const res = await postJson(fetchFn, url, buildMetaPurchase(p, match, env('META_TEST_EVENT_CODE')))
    const received = (res.json as { events_received?: number } | null)?.events_received
    if (res.ok && received !== 0) return 'sent'
    console.error('[tracking] Meta Conversions API rejected the Purchase', { reference: p.reference, status: res.status, body: res.text.slice(0, 500) })
    return 'failed'
  } catch (e) {
    console.error('[tracking] Meta Conversions API request failed', { reference: p.reference, error: String(e).slice(0, 300) })
    return 'failed'
  }
}

async function sendTikTok(p: ServerPurchase, match: AdMatch, fetchFn: typeof fetch): Promise<SendOutcome> {
  const pixelId = tiktokPixelId()
  const token = env('TIKTOK_EVENTS_ACCESS_TOKEN')
  if (!pixelId || !token) return 'skipped'
  try {
    const res = await postJson(fetchFn, TIKTOK_EVENTS_URL, buildTikTokPurchase(p, match, pixelId, env('TIKTOK_TEST_EVENT_CODE')), {
      'Access-Token': token,
    })
    // TikTok answers HTTP 200 even for errors; code 0 means accepted
    const code = (res.json as { code?: number } | null)?.code
    if (res.ok && code === 0) return 'sent'
    console.error('[tracking] TikTok Events API rejected the CompletePayment', { reference: p.reference, status: res.status, body: res.text.slice(0, 500) })
    return 'failed'
  } catch (e) {
    console.error('[tracking] TikTok Events API request failed', { reference: p.reference, error: String(e).slice(0, 300) })
    return 'failed'
  }
}

/**
 * Report a paid order to Meta and TikTok, if the buyer accepted ad cookies and
 * the platform is configured. Never throws.
 */
export async function sendServerPurchase(p: ServerPurchase, deps: Deps = {}): Promise<{ meta: SendOutcome; tiktok: SendOutcome }> {
  try {
    const ctx = readAdContext(p.metadata)
    if (ctx.consent !== 'granted') return { meta: 'skipped', tiktok: 'skipped' }
    const match = ctx.ad_match ?? {}
    const fetchFn = deps.fetch ?? fetch
    const [meta, tiktok] = await Promise.all([sendMeta(p, match, fetchFn), sendTikTok(p, match, fetchFn)])
    return { meta, tiktok }
  } catch (e) {
    console.error('[tracking] Server-side Purchase failed', { reference: p.reference, error: String(e).slice(0, 300) })
    return { meta: 'failed', tiktok: 'failed' }
  }
}

/**
 * For the payment routes: if this call newly recorded a paid order, report it
 * (call inside after()). Does nothing otherwise. Never throws.
 */
export async function reportPurchaseIfNew(
  recorded: RecordedOrder | null | undefined,
  charge: { reference: string; metadata: unknown; ipAddress?: string | null },
  deps: Deps = {},
): Promise<void> {
  try {
    if (!shouldSendServerPurchase(recorded)) return
    await sendServerPurchase(purchaseFromOrder(recorded!, charge), deps)
  } catch (e) {
    console.error('[tracking] Server-side Purchase failed', { reference: charge.reference, error: String(e).slice(0, 300) })
  }
}
