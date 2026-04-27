import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { settings } from '@/db'
import { inArray } from 'drizzle-orm'
import { ShippingForm } from '../../../_components/ShippingForm'

export const metadata = {
  title: 'Shipping Info — Twinkle Locs Admin',
}

const SHIPPING_KEYS = [
  'shipping_lagos_rate',
  'shipping_other_rate',
  'shipping_lagos_days',
  'shipping_other_days',
  'shipping_intl_message',
  'shipping_page_intro',
] as const

export default async function AdminShippingPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  let settingsMap: Record<string, string> = {}

  try {
    const rows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, [...SHIPPING_KEYS]))

    settingsMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  } catch (error) {
    console.error('Failed to fetch shipping settings:', error)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Shipping Info</h1>
        <p className="text-stone-400 text-sm mt-1">
          Delivery rates, timeframes, and international shipping copy. Changes appear on the
          /shipping page at next load — no redeploy needed.
        </p>
      </div>

      <ShippingForm settings={settingsMap} />
    </div>
  )
}
