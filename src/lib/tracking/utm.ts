/**
 * Ad attribution (UTM tags), shared by browser and server code.
 *
 * On landing, utm_source / utm_medium / utm_campaign / utm_content / utm_term are
 * stored in a first-party cookie for 30 days (last ad click wins). Checkout passes
 * them to Paystack in the order metadata, so every order records which ad it came
 * from even when pixels miss it, and the WhatsApp links append utm_content as a ref.
 * The cookie never leaves the site, so it doesn't depend on pixel consent.
 */

export const UTM_COOKIE = 'tl_utm'
export const UTM_MAX_AGE_DAYS = 30
export const UTM_KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const

export type UtmKey = (typeof UTM_KEYS)[number]
export type Utm = Partial<Record<UtmKey, string>>

const clean = (v: string) => v.trim().slice(0, 100)

/** The utm_* values in a URL's query, or null when there are none */
export function utmFromSearchParams(params: URLSearchParams): Utm | null {
  const utm: Utm = {}
  for (const key of UTM_KEYS) {
    const v = params.get(`utm_${key}`)
    if (v && clean(v)) utm[key] = clean(v)
  }
  return Object.keys(utm).length ? utm : null
}

/** Parse the cookie value (or Paystack metadata) back into tags; anything unexpected is dropped */
export function parseUtm(raw: unknown): Utm | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
  const utm: Utm = {}
  for (const key of UTM_KEYS) {
    const v = (obj as Record<string, unknown>)[key]
    if (typeof v === 'string' && clean(v)) utm[key] = clean(v)
  }
  return Object.keys(utm).length ? utm : null
}

/** Browser only: the stored tags, or null */
export function readUtmCookie(): Utm | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(UTM_COOKIE + '='))
  if (!match) return null
  try {
    return parseUtm(decodeURIComponent(match.slice(UTM_COOKIE.length + 1)))
  } catch {
    return null
  }
}

/** Browser only: store tags from the current URL, if it has any (last click wins) */
export function captureUtmFromLocation(): Utm | null {
  if (typeof window === 'undefined') return null
  const utm = utmFromSearchParams(new URLSearchParams(window.location.search))
  if (!utm) return null
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(utm))}; Path=/; Max-Age=${UTM_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`
  return utm
}
