import { describe, expect, it } from 'vitest'
import { DEFAULT_LANDING_CONFIG, hasPlaceholder, landingWhatsAppText, parseLandingConfig } from '@/lib/landing/config'
import { parseUtm, utmFromSearchParams } from '@/lib/tracking/utm'

describe('parseLandingConfig', () => {
  it('returns the defaults for nothing saved', () => {
    expect(parseLandingConfig(null)).toEqual(DEFAULT_LANDING_CONFIG)
    expect(parseLandingConfig('nope')).toEqual(DEFAULT_LANDING_CONFIG)
  })

  it('keeps valid values and falls back field by field', () => {
    const c = parseLandingConfig({
      featured: [{ slug: 'gold-twinkles', tagline: 'Warm gold', fallback: { size: '4mm', pack: 50, thread: 'black' } }, { slug: '' }],
      welcomeOffer: { enabled: false, percent: 500, expiryDays: 7 },
      hero: { headline: 'New headline' },
    })
    expect(c.featured).toEqual([{ slug: 'gold-twinkles', tagline: 'Warm gold', fallback: { size: '4mm', pack: 50, thread: 'black' } }])
    expect(c.welcomeOffer).toEqual({ enabled: false, percent: 10, expiryDays: 7, popup: false })
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

  it('caps featured products at 3', () => {
    const c = parseLandingConfig({ featured: ['a', 'b', 'c', 'd'].map((slug) => ({ slug, tagline: '' })) })
    expect(c.featured.map((f) => f.slug)).toEqual(['a', 'b', 'c'])
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
