import { SHOP_TIME_ZONE } from '@/lib/time/lagos'
import type { LandingConfig } from './config'
import { formatNaira } from './selection'

/** Client-safe wording for the welcome offer (email capture and pop-up) */

type Offer = Pick<LandingConfig['welcomeOffer'], 'enabled' | 'percent' | 'minOrder'>

/** "Get 10% off your first order of ₦100,000 or more" (no minimum: "Get 10% off your first order") */
export function welcomeOfferHeadline(offer: Offer): string {
  if (!offer.enabled) return 'Get Twinkle news'
  return `Get ${offer.percent}% off your first order${offer.minOrder > 0 ? ` of ${formatNaira(offer.minOrder)} or more` : ''}`
}

const time = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true })
const day = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' })

/** "9:41 pm" when it's today in Lagos, else "9:41 pm, Thu 19 Nov" */
export function formatLagosTime(at: Date, now: Date = new Date()): string {
  const sameDay = day.format(at) === day.format(now)
  return sameDay ? time.format(at) : `${time.format(at)}, ${day.format(at)}`
}

/** "Valid for 6 hours, until 9:41 pm (Lagos time)", from the code's expiry */
export function codeValidity(expiresAtIso: string, now: Date = new Date()): string {
  const at = new Date(expiresAtIso)
  if (Number.isNaN(at.getTime())) return ''
  const until = `${formatLagosTime(at, now)} (Lagos time)`
  const ms = at.getTime() - now.getTime()
  if (ms <= 0) return `This code expired at ${until}.`
  const hours = Math.round(ms / 3_600_000)
  if (hours < 1) return `Valid until ${until}.`
  return `Valid for ${hours} ${hours === 1 ? 'hour' : 'hours'}, until ${until}.`
}
