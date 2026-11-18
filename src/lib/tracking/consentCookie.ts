/**
 * The consent cookie's name and format, shared by browser and server code.
 * (./consent is the browser side: reading, writing and the React hook.)
 */

export type ConsentStatus = 'pending' | 'granted' | 'denied'

export const CONSENT_COOKIE = 'tl_consent'
export const CONSENT_MAX_AGE_DAYS = 180

/** Anything other than an explicit 'granted' or 'denied' means the visitor hasn't answered */
export function parseConsent(value: unknown): ConsentStatus {
  return value === 'granted' || value === 'denied' ? value : 'pending'
}
