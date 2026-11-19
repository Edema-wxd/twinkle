/**
 * Ad landing page (/shop-twinkles): the editable content.
 *
 * Stored as one JSON value in the `settings` table under LANDING_SETTINGS_KEY and
 * edited in Admin → Ad landing page, so Unoma can change it with no deploy.
 * This file is client-safe (no DB): the admin form imports the types and defaults.
 * The server loader is in ./config.server.ts.
 *
 * Never put prices, delivery fees, stock or review numbers here. Those come from
 * product data, Admin → Shipping and the reviews table, so the page always matches
 * what checkout charges.
 *
 * Any text containing "[confirm" is a placeholder waiting for Twinkle Locs' sign-off.
 * The page highlights it (see hasPlaceholder) so none slips into an ad.
 */

export const LANDING_SETTINGS_KEY = 'landing_page_config'

/** FAQs in Admin → FAQs with this category are the landing page's FAQ section */
export const LANDING_FAQ_CATEGORY = 'Landing page'

export const LANDING_PATH = '/shop-twinkles'

/** Bead sizes the size guide explains, in display order */
export const SIZE_GUIDE_SIZES = ['2mm', '4mm', '6mm'] as const
export type SizeGuideSize = (typeof SIZE_GUIDE_SIZES)[number]

export type FeaturedProductConfig = {
  /** Product slug (products.slug). Missing or inactive products are skipped on the page. */
  slug: string
  /** One line under the name, e.g. "Our richest gold, for statement styles" */
  tagline: string
  /**
   * Preselected options when there are no sales yet (or the best-seller is out of stock).
   * The page prefers the real best-seller from paid orders, like the product page does.
   * size = the variant's name as shown in Admin (e.g. "4mm"); pack = beads per pack; thread = THREAD_COLOURS id.
   */
  fallback: { size: string | null; pack: number | null; thread: string | null }
}

export type LandingImage = { url: string; alt: string }

/**
 * An alternative hero for testing ad creatives against each other. Each one has its
 * own link, /shop-twinkles/<key>, so every ad can land on the hero that matches it.
 * Empty headline/subhead and a missing image or video fall back to the main hero.
 */
export type HeroVariant = {
  /** URL key: lowercase letters, numbers and hyphens, e.g. "gold-video" */
  key: string
  /** Name for the admin list only, e.g. "Gold video, November ads" */
  label: string
  image: LandingImage | null
  videoUrl: string | null
  headline: string
  subhead: string
}

export type LandingConfig = {
  featured: FeaturedProductConfig[]
  /** Announcement bar text. Empty = built automatically from Admin → Shipping (free-delivery threshold, nationwide days). */
  announcement: string
  hero: {
    image: LandingImage | null
    /** Optional 6 to 10 s muted loop (MP4, under 1.5 MB); the image is its poster */
    videoUrl: string | null
    eyebrow: string
    headline: string
    subhead: string
    /** Alternative heroes at /shop-twinkles/<key>, for testing ad creatives (max 10) */
    variants: HeroVariant[]
  }
  finalCta: {
    image: LandingImage | null
    headline: string
    line: string
  }
  sizeGuide: {
    /** One photo per bead size on a loc */
    photos: Record<SizeGuideSize, LandingImage | null>
    descriptions: Record<SizeGuideSize, string>
    betweenSizesLine: string
  }
  howItWorks: {
    /** Lagos same-day cut-off shown in step 2, e.g. "Order before 12pm". Empty = not shown. */
    lagosCutoff: string
    /** Link for "Watch the 30-second how-to": a video URL or a blog post path (e.g. /blog/how-to-put-beads-in-locs). Empty = hidden. */
    howToUrl: string
  }
  /** One sentence under the shipping and payment cards */
  returnsLine: string
  /** Customer Instagram posts (saved images, not live embeds), shown under the reviews. Fewer than 4 = grid hidden. */
  instagram: (LandingImage & { postUrl: string | null })[]
  welcomeOffer: {
    enabled: boolean
    percent: number
    /** Hours each issued one-use code stays valid */
    expiryHours: number
    /** Smallest items subtotal (₦, before discount and delivery) the code works on; 0 = no minimum */
    minOrder: number
    /** Show the offer in a pop-up too (after 25 s, or exit intent on desktop). Off by default. */
    popup: boolean
  }
  /** Reviews section only shows with at least this many approved photo reviews */
  minReviewsToShowSection: number
  /** "★ 4.8 from N customers" only shows with at least this many reviews in total */
  minReviewsToShowRating: number
  /** "Only N packs left" only shows when tracked stock is at or under this many packs */
  stockWarningAt: number
}

export type LandingFaq = { question: string; answer: string }

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  featured: [
    { slug: '24k-gold-twinkles', tagline: 'Our richest gold, for statement styles', fallback: { size: null, pack: null, thread: null } },
    { slug: 'gold-twinkles', tagline: '[confirm] Warm gold that goes with everything', fallback: { size: null, pack: null, thread: null } },
    { slug: 'silver-twinkles', tagline: '[confirm] Cool silver shine for everyday locs', fallback: { size: null, pack: null, thread: null } },
  ],
  announcement: '',
  hero: {
    image: null,
    videoUrl: null,
    eyebrow: 'Handcrafted in Nigeria',
    headline: 'Loc beads that catch the light.',
    subhead: 'Twinkles in 24k gold, gold, silver and crystal. Made, not painted, so the colour never fades, even in the wash.',
    variants: [],
  },
  finalCta: {
    image: null,
    headline: 'Ready to Twinkle?',
    line: 'Handcrafted in Nigeria, delivered to your door.',
  },
  sizeGuide: {
    photos: { '2mm': null, '4mm': null, '6mm': null },
    descriptions: {
      '2mm': 'For micro and thin traditional locs.',
      '4mm': 'For most medium locs.',
      '6mm': 'For thick or freeform locs.',
    },
    betweenSizesLine: 'Between sizes? Go one size up. [confirm]',
  },
  howItWorks: {
    lagosCutoff: '',
    howToUrl: '',
  },
  returnsLine: 'Wrong size? Unopened packs can be swapped within 7 days of delivery.',
  instagram: [],
  welcomeOffer: {
    enabled: true,
    percent: 10,
    expiryHours: 6,
    minOrder: 100_000,
    popup: false,
  },
  minReviewsToShowSection: 3,
  minReviewsToShowRating: 10,
  stockWarningAt: 15,
}

/**
 * Draft FAQ answers from the build spec. Used by the page when Admin → FAQs has no
 * "Landing page" questions yet, and by the admin screen's "Add the draft FAQs" button.
 * All need Twinkle Locs' sign-off, hence the [confirm] marks.
 */
export const DEFAULT_LANDING_FAQS: LandingFaq[] = [
  {
    question: 'What size should I get?',
    answer:
      '2mm for micro and thin traditional locs, 4mm for most medium locs, 6mm for thick or freeform locs. Not sure? Send us a photo of your locs on WhatsApp and we will help you pick. [confirm]',
  },
  {
    question: 'How many beads do I need?',
    answer:
      'Most people use 1 to 3 beads per loc on part of their head. A pack of 50 suits accents; 100 to 200 suits a full shimmer look. [confirm]',
  },
  {
    question: 'How do I put them in?',
    answer: 'Thread a bead onto the loc, slide it up to where you want it, and you are done. No glue, no heat. [confirm]',
  },
  {
    question: 'Will they damage or snag my locs?',
    answer: 'No. The inside is smooth and polished so beads slide on without catching. [confirm]',
  },
  {
    question: 'Will the colour fade? Do they need special care?',
    answer: 'No and no. Twinkles are made in their colour, not painted, so they never fade, even in the wash. Wear them as you normally would.',
  },
  {
    question: 'How long does delivery take, and what does it cost?',
    answer: 'Lagos delivery is same day in most areas; the rest of Nigeria takes 3 to 5 business days. You see the exact delivery fee at checkout, before you pay.',
  },
  {
    question: 'Can I return or exchange?',
    answer: 'Unopened packs can be returned or swapped within 7 days of delivery. Wrong, damaged or faulty beads: tell us within 48 hours. See Returns & refunds for details.',
  },
  {
    question: 'How can I pay?',
    answer: 'Card (Visa, Mastercard, Verve), bank transfer or USSD, all through Paystack. We never see your card details.',
  },
]

/** True when text still holds a "[confirm" placeholder that needs sign-off */
export function hasPlaceholder(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.includes('[confirm')
}

// ── Validation ────────────────────────────────────────────────────────────────
// parseLandingConfig never throws: anything missing or the wrong type falls back
// to the default, so a half-saved or older config can't break the page.

const str = (v: unknown, fallback: string, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : fallback)

const int = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Only https URLs or site paths, so admin input can't inject javascript: links */
function url(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 1000)
  try {
    return new URL(s).protocol === 'https:' ? s.slice(0, 1000) : null
  } catch {
    return null
  }
}

function image(v: unknown): LandingImage | null {
  if (!isObj(v)) return null
  const u = url(v.url)
  return u ? { url: u, alt: str(v.alt, '', 200) } : null
}

/** Valid hero variant URL key */
export const HERO_VARIANT_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/

function heroVariant(v: unknown): HeroVariant | null {
  if (!isObj(v)) return null
  const key = str(v.key, '', 40).toLowerCase()
  if (!HERO_VARIANT_KEY.test(key)) return null
  return {
    key,
    label: str(v.label, '', 80),
    image: image(v.image),
    videoUrl: url(v.videoUrl),
    headline: str(v.headline, '', 120),
    subhead: str(v.subhead, '', 300),
  }
}

function featured(v: unknown): FeaturedProductConfig | null {
  if (!isObj(v)) return null
  const slug = str(v.slug, '', 200)
  if (!slug) return null
  const fb = isObj(v.fallback) ? v.fallback : {}
  return {
    slug,
    tagline: str(v.tagline, '', 160),
    fallback: {
      size: typeof fb.size === 'string' && fb.size.trim() ? fb.size.trim().slice(0, 40) : null,
      pack: typeof fb.pack === 'number' && Number.isInteger(fb.pack) && fb.pack > 0 ? fb.pack : null,
      thread: typeof fb.thread === 'string' && fb.thread.trim() ? fb.thread.trim().slice(0, 40) : null,
    },
  }
}

export function parseLandingConfig(raw: unknown): LandingConfig {
  const d = DEFAULT_LANDING_CONFIG
  if (!isObj(raw)) return structuredClone(d)

  const hero = isObj(raw.hero) ? raw.hero : {}
  const finalCta = isObj(raw.finalCta) ? raw.finalCta : {}
  const sizeGuide = isObj(raw.sizeGuide) ? raw.sizeGuide : {}
  const photos = isObj(sizeGuide.photos) ? sizeGuide.photos : {}
  const descriptions = isObj(sizeGuide.descriptions) ? sizeGuide.descriptions : {}
  const how = isObj(raw.howItWorks) ? raw.howItWorks : {}
  const offer = isObj(raw.welcomeOffer) ? raw.welcomeOffer : {}

  const featuredList = Array.isArray(raw.featured)
    ? raw.featured.map(featured).filter((f): f is FeaturedProductConfig => f !== null).slice(0, 3)
    : structuredClone(d.featured)

  const instagram = Array.isArray(raw.instagram)
    ? raw.instagram
        .map((p) => {
          const img = image(p)
          return img ? { ...img, postUrl: isObj(p) ? url(p.postUrl) : null } : null
        })
        .filter((p): p is LandingImage & { postUrl: string | null } => p !== null)
        .slice(0, 6)
    : []

  return {
    featured: featuredList,
    announcement: str(raw.announcement, d.announcement, 160),
    hero: {
      image: image(hero.image),
      videoUrl: url(hero.videoUrl),
      eyebrow: str(hero.eyebrow, d.hero.eyebrow, 80),
      headline: str(hero.headline, d.hero.headline, 120),
      subhead: str(hero.subhead, d.hero.subhead, 300),
      variants: Array.isArray(hero.variants)
        ? hero.variants
            .map(heroVariant)
            .filter((h): h is HeroVariant => h !== null)
            .filter((h, i, all) => all.findIndex((o) => o.key === h.key) === i)
            .slice(0, 10)
        : [],
    },
    finalCta: {
      image: image(finalCta.image),
      headline: str(finalCta.headline, d.finalCta.headline, 120),
      line: str(finalCta.line, d.finalCta.line, 200),
    },
    sizeGuide: {
      photos: Object.fromEntries(SIZE_GUIDE_SIZES.map((s) => [s, image(photos[s])])) as Record<SizeGuideSize, LandingImage | null>,
      descriptions: Object.fromEntries(SIZE_GUIDE_SIZES.map((s) => [s, str(descriptions[s], d.sizeGuide.descriptions[s], 200)])) as Record<
        SizeGuideSize,
        string
      >,
      betweenSizesLine: str(sizeGuide.betweenSizesLine, d.sizeGuide.betweenSizesLine, 200),
    },
    howItWorks: {
      lagosCutoff: str(how.lagosCutoff, d.howItWorks.lagosCutoff, 80),
      howToUrl: url(how.howToUrl) ?? '',
    },
    returnsLine: str(raw.returnsLine, d.returnsLine, 300),
    instagram,
    welcomeOffer: {
      enabled: bool(offer.enabled, d.welcomeOffer.enabled),
      percent: int(offer.percent, d.welcomeOffer.percent, 1, 50),
      expiryHours: int(offer.expiryHours, d.welcomeOffer.expiryHours, 1, 720),
      minOrder: int(offer.minOrder, d.welcomeOffer.minOrder, 0, 10_000_000),
      popup: bool(offer.popup, d.welcomeOffer.popup),
    },
    minReviewsToShowSection: int(raw.minReviewsToShowSection, d.minReviewsToShowSection, 1, 50),
    minReviewsToShowRating: int(raw.minReviewsToShowRating, d.minReviewsToShowRating, 1, 1000),
    stockWarningAt: int(raw.stockWarningAt, d.stockWarningAt, 0, 1000),
  }
}

export type ResolvedHero = Omit<LandingConfig['hero'], 'variants'> & {
  /** The variant shown, or null for the main hero */
  variantKey: string | null
}

/**
 * The hero for /shop-twinkles/<key>: the variant's own image, video, headline and
 * subhead, each falling back to the main hero when left empty. An unknown or
 * missing key gives the main hero.
 */
export function resolveHero(config: LandingConfig, key?: string | null): ResolvedHero {
  const { variants, ...main } = config.hero
  const v = key ? variants.find((h) => h.key === key.toLowerCase()) : undefined
  if (!v) return { ...main, variantKey: null }
  return {
    eyebrow: main.eyebrow,
    image: v.image ?? main.image,
    // A variant with its own image but no video shouldn't inherit the main video over it
    videoUrl: v.videoUrl ?? (v.image ? null : main.videoUrl),
    headline: v.headline || main.headline,
    subhead: v.subhead || main.subhead,
    variantKey: v.key,
  }
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

/** Where on the landing page a WhatsApp link was tapped (the Contact event's `location`) */
export type LandingWhatsAppLocation = 'hero' | 'sizeguide' | 'fab' | 'final'

/**
 * Prefilled WhatsApp messages. "came from your ad" stays in every one so the team
 * can attribute WhatsApp sales; the ad's utm_content is appended as "ref: ...".
 */
export const LANDING_WHATSAPP_TEXT: Record<LandingWhatsAppLocation, string> = {
  hero: 'Hi Twinkle Locs, I came from your ad and I am not sure which bead size to get.',
  sizeguide: "Hi Twinkle Locs, I came from your ad. Can you help me pick a bead size? Here's a photo of my locs.",
  fab: 'Hi Twinkle Locs, I came from your ad and have a question about Twinkles.',
  final: 'Hi Twinkle Locs, I came from your ad and would like to order on WhatsApp.',
}

/** The message with the ad reference appended, e.g. "... (ref: gold-video-1)" */
export function landingWhatsAppText(location: LandingWhatsAppLocation, utmContent?: string | null): string {
  const ref = utmContent?.trim().replace(/[^\w.-]/g, '').slice(0, 40)
  return ref ? `${LANDING_WHATSAPP_TEXT[location]} (ref: ${ref})` : LANDING_WHATSAPP_TEXT[location]
}
