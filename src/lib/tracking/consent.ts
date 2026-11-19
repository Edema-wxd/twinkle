'use client'

import { useSyncExternalStore } from 'react'
import { pixelsConfigured } from './config'
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, parseConsent, type ConsentStatus } from './consentCookie'

/**
 * Cookie consent for advertising pixels (Meta, TikTok).
 *
 * 'pending' until the visitor answers the banner. Pixels load, and browser events
 * are sent, only on 'granted'. The choice is kept in a first-party cookie for
 * 180 days so it is also readable on the server (e.g. to skip server-side events
 * for people who declined).
 *
 * When no pixel is configured there is nothing to agree to and no banner, so the
 * status reads 'denied' (nothing will load). That way UI that waits for the
 * banner to be answered (the landing page's sticky bar) is never held back.
 */
export type { ConsentStatus }
export { CONSENT_COOKIE, parseConsent }

const CHANGE_EVENT = 'tl-consent-change'

/** Cookies the pixels set themselves, plus the TikTok click id we keep (see ./pixels) */
const AD_COOKIES = ['_fbp', '_fbc', '_ttp', 'tl_ttclid']

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(name.length + 1))
  } catch {
    return null
  }
}

export function getConsent(): ConsentStatus {
  if (!pixelsConfigured()) return 'denied'
  return parseConsent(readCookie(CONSENT_COOKIE))
}

export function setConsent(status: Exclude<ConsentStatus, 'pending'>): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${status}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
  if (status === 'denied') clearAdCookies()
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Best effort: remove the pixels' own cookies after a decline. They are set on
 * the bare domain (".twinklelocs.com"), so try with and without a domain.
 */
function clearAdCookies(): void {
  const host = location.hostname.replace(/^www\./, '')
  for (const name of AD_COOKIES) {
    if (readCookie(name) === null) continue
    document.cookie = `${name}=; Path=/; Max-Age=0`
    document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${host}`
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

/** Live consent status. 'pending' on the server and during hydration. */
export function useConsentStatus(): ConsentStatus {
  return useSyncExternalStore(subscribe, getConsent, () => 'pending')
}

const noopSubscribe = () => () => {}

/** False on the server and during hydration, true once running in the browser */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
