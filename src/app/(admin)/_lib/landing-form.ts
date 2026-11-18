import { HERO_VARIANT_KEY, SIZE_GUIDE_SIZES, hasPlaceholder, type LandingConfig } from '@/lib/landing/config'
import { freeDeliveryLine } from '@/lib/checkout/freeDelivery'

/**
 * Pure helpers for the Admin → Ad landing page form (client-safe, no DB).
 * Field paths like "hero.subhead" or "featured.0.tagline" key both the
 * validation errors and the "needs sign-off" list.
 */

/** Product choices for the best-seller pickers: real variant names and pack sizes */
export type LandingProductOption = {
  slug: string
  name: string
  material: string
  variants: { name: string; packs: number[] }[]
}

/**
 * The announcement bar text when the field is left empty, built from Admin → Shipping.
 * The landing page builds the same line, so keep the two in step.
 */
export function autoAnnouncement(freeLagosOver: number, otherDays: string): string {
  const days = otherDays.trim() || '3 to 5 business days'
  const lagos = freeLagosOver > 0 ? freeDeliveryLine(freeLagosOver) : 'Same-day delivery in most of Lagos'
  return `${lagos} · Nationwide in ${days}`
}

/** Same rule as parseLandingConfig: an https link or a path on this site (not //) */
export function isSafeLink(value: string): boolean {
  const s = value.trim()
  if (!s) return true
  if (s.startsWith('/')) return !s.startsWith('//')
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}

type TextField = { path: string; label: string; value: string }

/** Every free-text field on the form, labelled the way the form labels it, in page order */
export function textFields(c: LandingConfig): TextField[] {
  const out: TextField[] = [{ path: 'announcement', label: 'Announcement bar', value: c.announcement }]
  out.push(
    { path: 'hero.eyebrow', label: 'Hero: small line above the headline', value: c.hero.eyebrow },
    { path: 'hero.headline', label: 'Hero: headline', value: c.hero.headline },
    { path: 'hero.subhead', label: 'Hero: line under the headline', value: c.hero.subhead },
  )
  if (c.hero.image) out.push({ path: 'hero.image.alt', label: 'Hero: photo description', value: c.hero.image.alt })
  c.hero.variants.forEach((v, i) => {
    const name = `Hero version ${i + 1}`
    out.push(
      { path: `hero.variants.${i}.label`, label: `${name}: name`, value: v.label },
      { path: `hero.variants.${i}.headline`, label: `${name}: headline`, value: v.headline },
      { path: `hero.variants.${i}.subhead`, label: `${name}: line under the headline`, value: v.subhead },
    )
    if (v.image) out.push({ path: `hero.variants.${i}.image.alt`, label: `${name}: photo description`, value: v.image.alt })
  })
  c.featured.forEach((f, i) => out.push({ path: `featured.${i}.tagline`, label: `Best-seller ${i + 1}: tagline`, value: f.tagline }))
  c.instagram.forEach((p, i) => out.push({ path: `instagram.${i}.alt`, label: `Instagram photo ${i + 1}: description`, value: p.alt }))
  for (const s of SIZE_GUIDE_SIZES) {
    out.push({ path: `sizeGuide.descriptions.${s}`, label: `Size guide: ${s} description`, value: c.sizeGuide.descriptions[s] })
    const photo = c.sizeGuide.photos[s]
    if (photo) out.push({ path: `sizeGuide.photos.${s}.alt`, label: `Size guide: ${s} photo description`, value: photo.alt })
  }
  out.push(
    { path: 'sizeGuide.betweenSizesLine', label: 'Size guide: between sizes line', value: c.sizeGuide.betweenSizesLine },
    { path: 'howItWorks.lagosCutoff', label: 'How it works: Lagos same-day cut-off', value: c.howItWorks.lagosCutoff },
    { path: 'returnsLine', label: 'Returns line', value: c.returnsLine },
    { path: 'finalCta.headline', label: 'Final band: headline', value: c.finalCta.headline },
    { path: 'finalCta.line', label: 'Final band: line under the headline', value: c.finalCta.line },
  )
  if (c.finalCta.image) out.push({ path: 'finalCta.image.alt', label: 'Final band: photo description', value: c.finalCta.image.alt })
  return out
}

/** Fields still holding a "[confirm" placeholder, which must be signed off before ads run */
export function placeholderFields(c: LandingConfig): TextField[] {
  return textFields(c).filter((f) => hasPlaceholder(f.value))
}

const NUMBER_RULES: { path: string; label: string; min: number; max: number; get: (c: LandingConfig) => number }[] = [
  { path: 'welcomeOffer.percent', label: 'Discount', min: 1, max: 50, get: (c) => c.welcomeOffer.percent },
  { path: 'welcomeOffer.expiryHours', label: 'Hours the code works', min: 1, max: 720, get: (c) => c.welcomeOffer.expiryHours },
  { path: 'welcomeOffer.minOrder', label: 'Minimum order', min: 0, max: 10_000_000, get: (c) => c.welcomeOffer.minOrder },
  { path: 'minReviewsToShowSection', label: 'Photo reviews needed', min: 1, max: 50, get: (c) => c.minReviewsToShowSection },
  { path: 'minReviewsToShowRating', label: 'Reviews needed', min: 1, max: 1000, get: (c) => c.minReviewsToShowRating },
  { path: 'stockWarningAt', label: 'Low stock', min: 0, max: 1000, get: (c) => c.stockWarningAt },
]

export const NUMBER_LIMITS: Record<string, { min: number; max: number }> = Object.fromEntries(
  NUMBER_RULES.map((r) => [r.path, { min: r.min, max: r.max }]),
)

const LINK_ERROR = 'Use a full link starting with https:// or a page on this site starting with /'
const ALT_ERROR = 'Describe the photo in a few words (for people using screen readers)'

/** missing = something still to fill in (shown once Save is pressed); otherwise the value is wrong (shown straight away) */
export type FieldError = { message: string; missing: boolean }

/**
 * Problems that stop the form saving, keyed by field path. The server cleans
 * everything again, but checking here means nothing is silently dropped.
 */
export function validateLandingForm(c: LandingConfig): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {}
  const wrong = (path: string, message: string) => (errors[path] = { message, missing: false })
  const missing = (path: string, message: string) => (errors[path] = { message, missing: true })

  for (const r of NUMBER_RULES) {
    const n = r.get(c)
    if (!Number.isInteger(n) || n < r.min || n > r.max) {
      const msg = `Enter a whole number from ${r.min.toLocaleString('en-NG')} to ${r.max.toLocaleString('en-NG')}`
      if (Number.isNaN(n)) missing(r.path, msg)
      else wrong(r.path, msg)
    }
  }

  const link = (path: string, v: string | null) => {
    if (v && !isSafeLink(v)) wrong(path, LINK_ERROR)
  }
  const alt = (path: string, img: { alt: string } | null) => {
    if (img && !img.alt.trim()) missing(path, ALT_ERROR)
  }

  link('hero.videoUrl', c.hero.videoUrl)
  alt('hero.image.alt', c.hero.image)
  const seen = new Map<string, number>()
  c.hero.variants.forEach((v, i) => {
    const path = `hero.variants.${i}.key`
    const key = v.key.trim()
    if (!key) missing(path, 'Give this version a link name, e.g. gold-video')
    else if (!HERO_VARIANT_KEY.test(key)) {
      wrong(path, 'Use lowercase letters, numbers and hyphens only (no spaces), starting and ending with a letter or number')
    } else if (seen.has(key)) wrong(path, `Version ${(seen.get(key) ?? 0) + 1} already uses this link name`)
    else seen.set(key, i)
    link(`hero.variants.${i}.videoUrl`, v.videoUrl)
    alt(`hero.variants.${i}.image.alt`, v.image)
  })

  const slugs = new Map<string, number>()
  c.featured.forEach((f, i) => {
    if (!f.slug) missing(`featured.${i}.slug`, 'Pick a product')
    else if (slugs.has(f.slug)) wrong(`featured.${i}.slug`, `Already picked as best-seller ${(slugs.get(f.slug) ?? 0) + 1}`)
    else slugs.set(f.slug, i)
  })

  c.instagram.forEach((p, i) => {
    alt(`instagram.${i}.alt`, p)
    link(`instagram.${i}.postUrl`, p.postUrl)
  })
  for (const s of SIZE_GUIDE_SIZES) alt(`sizeGuide.photos.${s}.alt`, c.sizeGuide.photos[s])
  link('howItWorks.howToUrl', c.howItWorks.howToUrl)
  alt('finalCta.image.alt', c.finalCta.image)

  return errors
}
