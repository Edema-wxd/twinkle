/**
 * Browser only: loads the Meta Pixel and TikTok Pixel once the visitor has
 * accepted ad cookies, and sends page views.
 *
 * The two install functions are the vendors' standard base code, written out
 * in TypeScript instead of pasted as inline scripts: a small stub that queues
 * calls, plus the vendor script loaded async (never render-blocking). The
 * vendor script replays the queue when it arrives.
 *
 * Nothing here runs before 'granted', and nothing throws.
 */
import { getConsent } from './consent'
import { metaPixelId, tiktokPixelId } from './config'

/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params, prefer-spread */
type Fbq = ((...args: any[]) => void) & Record<string, any>
type Ttq = any[] & Record<string, any>

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
    ttq?: Ttq
    TiktokAnalyticsObject?: string
  }
}

export const META_SCRIPT = 'https://connect.facebook.net/en_US/fbevents.js'
export const TIKTOK_SCRIPT = 'https://analytics.tiktok.com/i18n/pixel/events.js'
const TTCLID_COOKIE = 'tl_ttclid'
const TTCLID_MAX_AGE_DAYS = 7

const state = { meta: false, tiktok: false, lastPage: null as string | null }

function appendScript(src: string): void {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

/** Meta's base code (fbevents.js stub) */
function installMetaBase(): void {
  const w = window
  if (w.fbq) return
  const n = function () {
    if (n.callMethod) n.callMethod.apply(n, arguments)
    else n.queue.push(arguments)
  } as unknown as Fbq
  if (!w._fbq) w._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  w.fbq = n
  appendScript(META_SCRIPT)
}

/** TikTok's base code (ttq stub); the script itself is added by ttq.load(id) */
function installTikTokBase(): void {
  const w = window
  const t = 'ttq'
  w.TiktokAnalyticsObject = t
  const ttq: Ttq = (w.ttq = w.ttq || ([] as unknown as Ttq))
  if (typeof ttq.load === 'function') return
  ttq.methods = [
    'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group',
    'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent',
  ]
  ttq.setAndDefer = function (obj: any, method: string) {
    obj[method] = function () {
      obj.push([method].concat(Array.prototype.slice.call(arguments, 0)))
    }
  }
  for (const m of ttq.methods) ttq.setAndDefer(ttq, m)
  ttq.instance = function (id: string) {
    const e = ttq._i[id] || []
    for (const m of ttq.methods) ttq.setAndDefer(e, m)
    return e
  }
  ttq.load = function (id: string, options?: Record<string, unknown>) {
    ttq._i = ttq._i || {}
    ttq._i[id] = []
    ttq._i[id]._u = TIKTOK_SCRIPT
    ttq._t = ttq._t || {}
    ttq._t[id] = +new Date()
    ttq._o = ttq._o || {}
    ttq._o[id] = options || {}
    appendScript(`${TIKTOK_SCRIPT}?sdkid=${encodeURIComponent(id)}&lib=${t}`)
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any, prefer-rest-params, prefer-spread */

/**
 * TikTok's click id arrives as ?ttclid= on the ad's landing URL. Keep it (only
 * with consent) so the server-side purchase can be matched to the ad click.
 */
function keepTtclid(): void {
  const ttclid = new URLSearchParams(window.location.search).get('ttclid')
  if (!ttclid || ttclid.length > 500) return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${TTCLID_COOKIE}=${encodeURIComponent(ttclid)}; Path=/; Max-Age=${TTCLID_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
}

/**
 * Load whichever pixels are configured, once. Returns true when at least one is
 * loaded. Safe to call repeatedly; does nothing without consent.
 */
export function loadPixels(): boolean {
  if (typeof window === 'undefined' || getConsent() !== 'granted') return false
  // Each pixel on its own: one failing never stops the other. Tried once per page.
  const metaId = metaPixelId()
  if (metaId && !state.meta) {
    state.meta = true
    try {
      installMetaBase()
      // We send PageView ourselves on route changes; stop fbevents also sending one on pushState
      window.fbq!.disablePushState = true
      window.fbq!('init', metaId)
    } catch (e) {
      console.warn('[tracking] Could not load the Meta Pixel', e)
    }
  }
  const tiktokId = tiktokPixelId()
  if (tiktokId && !state.tiktok) {
    state.tiktok = true
    try {
      installTikTokBase()
      window.ttq!.load(tiktokId)
      keepTtclid()
    } catch (e) {
      console.warn('[tracking] Could not load the TikTok Pixel', e)
    }
  }
  return state.meta || state.tiktok
}

/** Which pixels have been loaded on this page */
export function loadedPixels(): { meta: boolean; tiktok: boolean } {
  return { meta: state.meta, tiktok: state.tiktok }
}

/** PageView for this path, once per path change. Loads the pixels first if needed. */
export function trackPageView(path: string): void {
  if (!loadPixels() || path === state.lastPage) return
  state.lastPage = path
  try {
    if (state.meta) window.fbq?.('track', 'PageView')
  } catch {
    /* a broken pixel never breaks the page */
  }
  try {
    if (state.tiktok) window.ttq?.page()
  } catch {
    /* a broken pixel never breaks the page */
  }
}

/** Tests only: forget what has been loaded */
export function resetPixelsForTests(): void {
  state.meta = false
  state.tiktok = false
  state.lastPage = null
}
