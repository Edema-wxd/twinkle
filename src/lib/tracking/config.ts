/**
 * Which ad pixels are switched on. Shared by browser and server code.
 *
 * Each pixel is on only when its ID is set (NEXT_PUBLIC_META_PIXEL_ID,
 * NEXT_PUBLIC_TIKTOK_PIXEL_ID). With neither set there is no consent banner,
 * no pixel script and no server-side event: everything quietly does nothing.
 *
 * The IDs are read on each call (not cached in a constant) so tests can switch
 * them; Next.js still inlines NEXT_PUBLIC_* values into the browser bundle.
 * An ID that doesn't look like one (typo, stray quote) counts as unset.
 */

const META_ID_RE = /^\d{5,20}$/
const TIKTOK_ID_RE = /^[A-Z0-9]{8,32}$/i

export function metaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()
  return id && META_ID_RE.test(id) ? id : null
}

export function tiktokPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim()
  return id && TIKTOK_ID_RE.test(id) ? id : null
}

/** True when at least one pixel is configured (and so the consent banner is needed) */
export function pixelsConfigured(): boolean {
  return metaPixelId() !== null || tiktokPixelId() !== null
}
