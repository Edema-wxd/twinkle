/**
 * HTTP contract between the landing page's email capture and /api/newsletter/subscribe.
 *
 * The form posts the usual subscribe body plus `offer: 'welcome'` and `source_page: 'lp'`:
 *   { first_name, email, source_page: 'lp', offer: 'welcome', website, elapsed_ms }
 *
 * When the welcome offer is on (Admin → Ad landing page), the response includes the
 * visitor's own one-use code (the same code again if this email already has one):
 *   201/200 { ok: true, pending: boolean, offer: WelcomeOfferCode }
 * The code is also emailed to them. Newsletters still need the confirm click.
 * With the offer off, the response is the normal subscribe response (no `offer`).
 */
export const WELCOME_OFFER_SOURCE = 'welcome'

export type WelcomeOfferCode = {
  code: string
  percent: number
  /** ISO date-time the code stops working (hours after signup, see Admin → Ad landing page) */
  expiresAt: string
  /** Smallest items subtotal (₦, before discount and delivery) the code works on; 0 = no minimum */
  minOrder: number
}

export type SubscribeResponse = {
  ok?: boolean
  pending?: boolean
  error?: string
  offer?: WelcomeOfferCode
}
