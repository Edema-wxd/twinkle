// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { checkoutAdMetadata } from '@/lib/tracking/checkout'
import { readAdContext } from '@/lib/tracking/adContext'
import { setConsent } from '@/lib/tracking/consent'

function clearCookies() {
  for (const c of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${c.split('=')[0]}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
  document.cookie = `tl_utm=${encodeURIComponent(JSON.stringify({ source: 'tiktok', content: 'gold-video-1' }))}; Path=/`
  document.cookie = '_fbp=fb.1.1700.123; Path=/'
  document.cookie = '_ttp=ttp-value; Path=/'
})

afterEach(() => {
  clearCookies()
  vi.unstubAllEnvs()
})

describe('checkout ad metadata', () => {
  it('always carries the ad tags and the consent answer', () => {
    expect(checkoutAdMetadata()).toEqual({ utm: { source: 'tiktok', content: 'gold-video-1' }, consent: 'pending' })
    setConsent('denied')
    expect(checkoutAdMetadata()).toEqual({ utm: { source: 'tiktok', content: 'gold-video-1' }, consent: 'denied' })
  })

  it('adds the pixel ids, page and browser only with consent', () => {
    setConsent('granted')
    document.cookie = '_fbp=fb.1.1700.123; Path=/'
    const meta = checkoutAdMetadata()
    expect(meta.consent).toBe('granted')
    expect(meta.ad_match).toMatchObject({ fbp: 'fb.1.1700.123', ttp: 'ttp-value', page_url: 'http://localhost:3000/' })
    expect(meta.ad_match?.user_agent).toBeTruthy()
    expect(meta.ad_match).not.toHaveProperty('fbc')
  })

  it('round-trips through the server reader', () => {
    setConsent('granted')
    document.cookie = '_fbp=fb.1.1700.123; Path=/'
    const back = readAdContext(JSON.parse(JSON.stringify({ cart_items: [], ...checkoutAdMetadata() })))
    expect(back.consent).toBe('granted')
    expect(back.utm).toEqual({ source: 'tiktok', content: 'gold-video-1' })
    expect(back.ad_match?.fbp).toBe('fb.1.1700.123')
  })
})

describe('readAdContext', () => {
  it('ignores ad match ids without consent and junk values', () => {
    expect(readAdContext({ consent: 'denied', ad_match: { fbp: 'x' } })).toEqual({ utm: null, consent: 'denied' })
    expect(readAdContext({ consent: 'granted', ad_match: { fbp: 42, page_url: 'javascript:alert(1)', ttp: ' t ' } })).toEqual({
      utm: null,
      consent: 'granted',
      ad_match: { ttp: 't' },
    })
    expect(readAdContext(null)).toEqual({ utm: null, consent: 'pending' })
    expect(readAdContext('not json')).toEqual({ utm: null, consent: 'pending' })
  })
})
