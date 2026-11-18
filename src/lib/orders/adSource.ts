/** Pure helpers (safe in the browser): which ad an order came from. */
import { metadataObject } from '@/lib/tracking/adContext'
import { UTM_KEYS, parseUtm, type Utm, type UtmKey } from '@/lib/tracking/utm'

/**
 * The UTM tags checkout recorded in the Paystack metadata (from the last tagged
 * ad link the buyer followed), or null for orders that didn't come from one.
 * Not an orders column: read back from the saved payment record.
 */
export function utmFromPayload(paystackPayload: unknown): Utm | null {
  const payload = metadataObject(paystackPayload)
  const meta = metadataObject(payload?.metadata)
  return meta ? parseUtm(meta.utm) : null
}

export const UTM_LABELS: Record<UtmKey, string> = {
  source: 'Source',
  medium: 'Medium',
  campaign: 'Campaign',
  content: 'Ad (content)',
  term: 'Term',
}

/** [label, value] pairs in a fixed order, for display */
export function utmRows(utm: Utm | null): [string, string][] {
  if (!utm) return []
  return UTM_KEYS.filter((k) => utm[k]).map((k) => [UTM_LABELS[k], utm[k]!])
}
