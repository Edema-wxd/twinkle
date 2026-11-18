/**
 * The ad-attribution part of the Paystack metadata, shared by browser and server.
 * Checkout writes it (./checkout), the server reads it back from the saved
 * payment record. It came from the browser, so it is treated as untrusted:
 * anything unexpected is dropped, and it is only used for ad reporting.
 */
import { parseConsent, type ConsentStatus } from './consentCookie'
import { parseUtm, type Utm } from './utm'

/** Browser ids for ad matching, sent only with consent */
export type AdMatch = {
  /** Meta browser id cookie (_fbp) */
  fbp?: string
  /** Meta click id cookie (_fbc) */
  fbc?: string
  /** TikTok browser id cookie (_ttp) */
  ttp?: string
  /** TikTok click id from the ad link */
  ttclid?: string
  /** Page checkout happened on, for event_source_url */
  page_url?: string
  user_agent?: string
}

export type CheckoutAdMetadata = {
  utm: Utm | null
  consent: ConsentStatus
  ad_match?: AdMatch
}

const MATCH_KEYS = ['fbp', 'fbc', 'ttp', 'ttclid', 'page_url', 'user_agent'] as const

/** Paystack metadata can come back as an object or (rarely) a JSON string */
export function metadataObject(raw: unknown): Record<string, unknown> | null {
  let v = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return null
    }
  }
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Read consent, ad match ids and UTM tags from checkout metadata */
export function readAdContext(metadata: unknown): CheckoutAdMetadata {
  const m = metadataObject(metadata)
  if (!m) return { utm: null, consent: 'pending' }
  const out: CheckoutAdMetadata = { utm: parseUtm(m.utm), consent: parseConsent(m.consent) }
  const rawMatch = metadataObject(m.ad_match)
  if (out.consent === 'granted' && rawMatch) {
    const match: AdMatch = {}
    for (const key of MATCH_KEYS) {
      const v = rawMatch[key]
      if (typeof v === 'string' && v.trim()) match[key] = v.trim().slice(0, 500)
    }
    if (match.page_url && !/^https?:\/\//i.test(match.page_url)) delete match.page_url
    out.ad_match = match
  }
  return out
}
