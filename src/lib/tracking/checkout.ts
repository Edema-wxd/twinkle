/**
 * Browser only: the ad-attribution fields checkout adds to the Paystack metadata.
 *
 * - utm: the ad tags from the last tagged link (first-party, no consent needed)
 * - consent: the visitor's pixel choice, so the server only sends its own
 *   Purchase event when it was 'granted'
 * - ad_match (only when 'granted'): the pixels' browser ids and the page, which
 *   help Meta and TikTok match the server-side Purchase to the ad click
 *
 * The server reads these back with readAdContext() (./adContext).
 */
import { getConsent } from './consent'
import { readUtmCookie } from './utm'
import type { AdMatch, CheckoutAdMetadata } from './adContext'

function cookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  if (!match) return undefined
  try {
    const v = decodeURIComponent(match.slice(name.length + 1))
    return v ? v.slice(0, 500) : undefined
  } catch {
    return undefined
  }
}

export function checkoutAdMetadata(): CheckoutAdMetadata {
  if (typeof document === 'undefined') return { utm: null, consent: 'pending' }
  try {
    const consent = getConsent()
    const out: CheckoutAdMetadata = { utm: readUtmCookie(), consent }
    if (consent === 'granted') {
      const match: AdMatch = {
        fbp: cookie('_fbp'),
        fbc: cookie('_fbc'),
        ttp: cookie('_ttp'),
        ttclid: cookie('tl_ttclid'),
        page_url: `${location.origin}${location.pathname}`,
        user_agent: navigator.userAgent.slice(0, 500),
      }
      out.ad_match = Object.fromEntries(Object.entries(match).filter(([, v]) => v)) as AdMatch
    }
    return out
  } catch {
    return { utm: null, consent: 'pending' }
  }
}
