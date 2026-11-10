import { inArray } from 'drizzle-orm'
import { db, settings as settingsTable } from '@/db'
import { LAGOS_ZONES, dbKeyForZone, getZoneIdForArea, type ShippingZone } from './shippingZones'

/**
 * THE single source of truth for shipping prices and delivery times.
 *
 * - Lagos: priced by delivery zone (src/lib/checkout/shippingZones.ts holds the
 *   areas, delivery times and default fees from Unoma's zone price list; the fee
 *   can be overridden per zone in Admin → Shipping).
 * - Every other state: one flat rate + timeframe, set in Admin → Shipping.
 *
 * Checkout charges from this, and every page that mentions shipping (the
 * /shipping page, page meta descriptions, llms.txt, order confirmation)
 * reads from this, so what customers are told always matches what they pay.
 */

export const DEFAULT_OTHER_STATES_RATE = 4500
export const DEFAULT_OTHER_STATES_DAYS = '3–5 business days'

const KEYS = [
  'shipping_other_rate',
  'shipping_other_days',
  'shipping_intl_message',
  'shipping_page_intro',
  ...LAGOS_ZONES.map((z) => dbKeyForZone(z.id)),
]

export type PricedZone = ShippingZone & { fee: number }

export type ShippingInfo = {
  zones: PricedZone[]
  lagosFrom: number
  lagosTo: number
  otherRate: number
  otherDays: string
  intlMessage: string
  pageIntro: string
}

function parseRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getShippingInfo(): Promise<ShippingInfo> {
  const raw: Record<string, string> = {}
  try {
    const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, KEYS))
    for (const r of rows) raw[r.key] = r.value
  } catch (err) {
    console.error('[shipping] Failed to fetch shipping settings, using defaults:', err)
  }

  const zones = LAGOS_ZONES.map((z) => ({ ...z, fee: parseRate(raw[dbKeyForZone(z.id)], z.defaultFee) }))
  const fees = zones.map((z) => z.fee)

  return {
    zones,
    lagosFrom: Math.min(...fees),
    lagosTo: Math.max(...fees),
    otherRate: parseRate(raw.shipping_other_rate, DEFAULT_OTHER_STATES_RATE),
    otherDays: raw.shipping_other_days?.trim() || DEFAULT_OTHER_STATES_DAYS,
    intlMessage: raw.shipping_intl_message?.trim() || "Hi, I'd like a shipping quote for an international order.",
    pageIntro: raw.shipping_page_intro?.trim() || 'We deliver across Nigeria.',
  }
}

export type ShippingQuote = {
  cost: number
  deliveryTime: string
  zone: PricedZone | null
}

/**
 * Price + delivery time for a destination.
 * Lagos without a recognised area (checkout always sends one) is charged the
 * highest zone fee, so a missing area can never undercharge.
 */
export function quoteShipping(info: ShippingInfo, state: string, area?: string | null): ShippingQuote {
  if (state === 'Lagos') {
    const zoneId = area ? getZoneIdForArea(area) : null
    const zone = info.zones.find((z) => z.id === zoneId) ?? null
    if (zone) return { cost: zone.fee, deliveryTime: zone.deliveryTime, zone }
    const priciest = info.zones.reduce((a, b) => (b.fee > a.fee ? b : a))
    return { cost: priciest.fee, deliveryTime: priciest.deliveryTime, zone: null }
  }
  return { cost: info.otherRate, deliveryTime: info.otherDays, zone: null }
}

export function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG')
}

/** Delivery estimate for a placed order (the Lagos area lives in the Paystack metadata). */
export function deliveryEstimateForOrder(info: ShippingInfo, state: string, paystackPayload: unknown): string {
  const meta = (paystackPayload as { metadata?: { customer_details?: { lga?: unknown } } } | null)?.metadata
  const area = typeof meta?.customer_details?.lga === 'string' ? meta.customer_details.lga : null
  const q = quoteShipping(info, state, area)
  if (state === 'Lagos') {
    return q.zone ? `${q.deliveryTime} after dispatch (${q.zone.name}, Lagos)` : `same day or next day within Lagos`
  }
  return `${q.deliveryTime} to ${state}`
}
