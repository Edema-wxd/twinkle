import type { Metadata } from 'next'
import { LANDING_PATH, resolveHero } from './config'
import { loadLandingConfig } from './data'

export const LANDING_TITLE = 'Twinkle Locs | Handcrafted Loc Beads, Delivered Across Nigeria'
export const LANDING_DESCRIPTION = 'Gold, silver and crystal loc beads handcrafted in Nigeria. Same-day Lagos delivery, secure Paystack checkout.'

/**
 * Metadata for /shop-twinkles and every hero version. Not indexed while ads are
 * tested (follow stays on), and every version points its canonical at /shop-twinkles.
 * The share image is the hero shown, else the site's 1200x630 image.
 */
export async function landingMetadata(heroKey: string | null): Promise<Metadata> {
  const hero = resolveHero(await loadLandingConfig(), heroKey)
  const images = hero.image
    ? [{ url: hero.image.url, alt: hero.image.alt || 'Twinkles loc beads on locs' }]
    : [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Twinkle Locs: handcrafted loc beads' }]
  return {
    title: { absolute: LANDING_TITLE },
    description: LANDING_DESCRIPTION,
    robots: { index: false, follow: true },
    alternates: { canonical: LANDING_PATH },
    openGraph: { title: LANDING_TITLE, description: LANDING_DESCRIPTION, url: LANDING_PATH, type: 'website', images },
    twitter: { card: 'summary_large_image', title: LANDING_TITLE, description: LANDING_DESCRIPTION, images },
  }
}
