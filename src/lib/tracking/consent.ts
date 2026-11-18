'use client'

import { useSyncExternalStore } from 'react'

/**
 * Cookie consent for advertising pixels (Meta, TikTok).
 *
 * 'pending' until the visitor answers the banner. Pixels load, and browser events
 * are sent, only on 'granted'. The choice is kept in a first-party cookie for
 * 180 days so it is also readable on the server (e.g. to skip server-side events
 * for people who declined).
 */
export type ConsentStatus = 'pending' | 'granted' | 'denied'

export const CONSENT_COOKIE = 'tl_consent'
const CONSENT_MAX_AGE_DAYS = 180
const CHANGE_EVENT = 'tl-consent-change'

export function parseConsent(value: string | null | undefined): ConsentStatus {
  return value === 'granted' || value === 'denied' ? value : 'pending'
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export function getConsent(): ConsentStatus {
  return parseConsent(readCookie(CONSENT_COOKIE))
}

export function setConsent(status: Exclude<ConsentStatus, 'pending'>): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${status}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CHANGE_EVENT, onChange)
}

/** Live consent status. 'pending' on the server and during hydration. */
export function useConsentStatus(): ConsentStatus {
  return useSyncExternalStore(subscribe, getConsent, () => 'pending')
}
