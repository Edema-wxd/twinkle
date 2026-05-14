import { db, settings as settingsTable } from '@/db'
import { inArray } from 'drizzle-orm'
import { LAGOS_ZONES, dbKeyForZone, getZoneIdForArea } from './shippingZones'

const BASE_KEYS = ['shipping_lagos_rate', 'shipping_other_rate'] as const
const ZONE_KEYS = LAGOS_ZONES.map((z) => dbKeyForZone(z.id))
const ALL_RATE_KEYS = [...BASE_KEYS, ...ZONE_KEYS]

const defaults = {
  shipping_lagos_rate: 3000,
  shipping_other_rate: 4500,
}

function parseRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

async function fetchRateRows(): Promise<Record<string, string | undefined>> {
  let rows: { key: string; value: string }[] = []
  try {
    rows = await db
      .select()
      .from(settingsTable)
      .where(inArray(settingsTable.key, ALL_RATE_KEYS))
  } catch (err) {
    console.error('[shipping] Failed to fetch shipping settings:', err)
  }
  const raw: Record<string, string | undefined> = {}
  for (const row of rows) raw[row.key] = row.value
  return raw
}

export async function getShippingRatesFromDb(): Promise<{
  lagosRate: number
  otherRate: number
}> {
  const raw = await fetchRateRows()
  return {
    lagosRate: parseRate(raw.shipping_lagos_rate, defaults.shipping_lagos_rate),
    otherRate: parseRate(raw.shipping_other_rate, defaults.shipping_other_rate),
  }
}

export async function getZoneShippingCostFromDb(zoneId: number): Promise<number> {
  const zone = LAGOS_ZONES.find((z) => z.id === zoneId)
  if (!zone) return defaults.shipping_lagos_rate
  const raw = await fetchRateRows()
  return parseRate(raw[dbKeyForZone(zoneId)], zone.defaultFee)
}

export async function getShippingCostFromDb(state: string, lga?: string): Promise<number> {
  if (state === 'Lagos' && lga) {
    const zoneId = getZoneIdForArea(lga)
    if (zoneId) return getZoneShippingCostFromDb(zoneId)
  }
  const { lagosRate, otherRate } = await getShippingRatesFromDb()
  return state === 'Lagos' ? lagosRate : otherRate
}
