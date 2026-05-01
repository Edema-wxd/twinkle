import { db, settings as settingsTable } from '@/db'
import { inArray } from 'drizzle-orm'

const SHIPPING_KEYS = ['shipping_lagos_rate', 'shipping_other_rate'] as const

const defaults = {
  shipping_lagos_rate: 3000,
  shipping_other_rate: 4500,
}

function parseRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getShippingRatesFromDb(): Promise<{
  lagosRate: number
  otherRate: number
}> {
  let rows: { key: string; value: string }[] = []
  try {
    rows = await db
      .select()
      .from(settingsTable)
      .where(inArray(settingsTable.key, [...SHIPPING_KEYS]))
  } catch (err) {
    console.error('[shipping] Failed to fetch shipping settings:', err)
  }

  const raw: Record<string, string | undefined> = {}
  for (const row of rows) raw[row.key] = row.value

  return {
    lagosRate: parseRate(raw.shipping_lagos_rate, defaults.shipping_lagos_rate),
    otherRate: parseRate(raw.shipping_other_rate, defaults.shipping_other_rate),
  }
}

export async function getShippingCostFromDb(state: string): Promise<number> {
  const { lagosRate, otherRate } = await getShippingRatesFromDb()
  return state === 'Lagos' ? lagosRate : otherRate
}

