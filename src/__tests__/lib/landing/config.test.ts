import { describe, expect, it } from 'vitest'
import { DEFAULT_LANDING_CONFIG, hasPlaceholder, landingWhatsAppText, parseLandingConfig, resolveHero } from '@/lib/landing/config'
import { parseUtm, utmFromSearchParams } from '@/lib/tracking/utm'

describe('parseLandingConfig', () => {
  it('returns the defaults for nothing saved', () => {
    expect(parseLandingConfig(null)).toEqual(DEFAULT_LANDING_CONFIG)
    expect(parseLandingConfig('nope')).toEqual(DEFAULT_LANDING_CONFIG)
  })

  it('keeps valid values and falls back field by field', () => {
    const c = parseLandingConfig({
      featured: [{ slug: 'gold-twinkles', tagline: 'Warm gold', fallback: { size: '4mm', pack: 50, thread: 'black' } }, { slug: '' }],
      welcomeOffer: { enabled: false, percent: 500, expiryHours: 12, minOrder: 50000 },
      hero: { headline: 'New headline' },
    })
    expect(c.featured).toEqual([{ slug: 'gold-twinkles', tagline: 'Warm gold', fallback: { size: '4mm', pack: 50, thread: 'black' } }])
    expect(c.welcomeOffer).toEqual({ enabled: false, percent: 10, expiryHours: 12, minOrder: 50000, popup: false })
    expect(c.hero.headline).toBe('New headline')
    expect(c.hero.eyebrow).toBe(DEFAULT_LANDING_CONFIG.hero.eyebrow)
  })

  it('drops unsafe image and link URLs', () => {
    const c = parseLandingConfig({
      hero: { image: { url: 'javascript:alert(1)', alt: 'x' }, videoUrl: 'http://example.com/v.mp4' },
      finalCta: { image: { url: 'https://ta1u3ge9om.ufs.sh/f/abc', alt: 'Locs' } },
      howItWorks: { howToUrl: '//evil.example' },
    })
    expect(c.hero.image).toBeNull()
    expect(c.hero.videoUrl).toBeNull()
    expect(c.finalCta.image).toEqual({ url: 'https://ta1u3ge9om.ufs.sh/f/abc', alt: 'Locs' })
    expect(c.howItWorks.howToUrl).toBe('')
  })

  it('defaults the welcome offer to 10% for 6 hours on ₦100,000+', () => {
    expect(DEFAULT_LANDING_CONFIG.welcomeOffer).toMatchObject({ percent: 10, expiryHours: 6, minOrder: 100_000 })
  })

  it('keeps valid, unique hero variant keys only', () => {
    const c = parseLandingConfig({
      hero: {
        variants: [
          { key: 'Gold-Video', label: 'Gold', headline: 'Gold' },
          { key: 'gold-video', label: 'Dupe' },
          { key: 'bad key!', label: 'Bad' },
          { key: '-edge', label: 'Bad' },
        ],
      },
    })
    expect(c.hero.variants.map((v) => v.key)).toEqual(['gold-video'])
  })

  it('caps featured products at 3', () => {
    const c = parseLandingConfig({ featured: ['a', 'b', 'c', 'd'].map((slug) => ({ slug, tagline: '' })) })
    expect(c.featured.map((f) => f.slug)).toEqual(['a', 'b', 'c'])
  })
})

describe('resolveHero', () => {
  const config = parseLandingConfig({
    hero: {
      image: { url: 'https://ta1u3ge9om.ufs.sh/f/main', alt: 'Main' },
      videoUrl: 'https://ta1u3ge9om.ufs.sh/f/main.mp4',
      headline: 'Main headline',
      variants: [
        { key: 'gold-video', label: 'Gold', videoUrl: 'https://ta1u3ge9om.ufs.sh/f/gold.mp4', headline: 'Gold headline' },
        { key: 'silver-photo', label: 'Silver', image: { url: 'https://ta1u3ge9om.ufs.sh/f/silver', alt: 'Silver' } },
      ],
    },
  })

  it('gives the main hero for no key or an unknown key', () => {
    expect(resolveHero(config).variantKey).toBeNull()
    expect(resolveHero(config, 'nope').headline).toBe('Main headline')
  })

  it('overrides only what the variant sets', () => {
    const gold = resolveHero(config, 'GOLD-VIDEO')
    expect(gold).toMatchObject({ variantKey: 'gold-video', headline: 'Gold headline', videoUrl: 'https://ta1u3ge9om.ufs.sh/f/gold.mp4' })
    expect(gold.image?.alt).toBe('Main')
    expect(gold.subhead).toBe(DEFAULT_LANDING_CONFIG.hero.subhead)
  })

  it("doesn't play the main video over a variant's own photo", () => {
    const silver = resolveHero(config, 'silver-photo')
    expect(silver.image?.alt).toBe('Silver')
    expect(silver.videoUrl).toBeNull()
  })
})

describe('landing helpers', () => {
  it('spots placeholders', () => {
    expect(hasPlaceholder('Go one size up. [confirm]')).toBe(true)
    expect(hasPlaceholder('Go one size up.')).toBe(false)
  })

  it('keeps "came from your ad" and appends a clean ref', () => {
    expect(landingWhatsAppText('fab')).toContain('came from your ad')
    expect(landingWhatsAppText('fab', 'gold video 1')).toMatch(/\(ref: goldvideo1\)$/)
  })
})

describe('utm', () => {
  it('reads utm_* from a query string', () => {
    expect(utmFromSearchParams(new URLSearchParams('utm_source=instagram&utm_content=gold-video-1&x=1'))).toEqual({
      source: 'instagram',
      content: 'gold-video-1',
    })
    expect(utmFromSearchParams(new URLSearchParams('x=1'))).toBeNull()
  })

  it('parses stored tags and drops junk', () => {
    expect(parseUtm('{"source":"tiktok","evil":"x","campaign":5}')).toEqual({ source: 'tiktok' })
    expect(parseUtm('not json')).toBeNull()
  })
})
