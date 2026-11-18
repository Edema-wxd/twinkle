// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { CONSENT_COOKIE, getConsent, parseConsent, setConsent } from '@/lib/tracking/consent'
import { parseConsent as parseConsentShared } from '@/lib/tracking/consentCookie'
import { metaPixelId, pixelsConfigured, tiktokPixelId } from '@/lib/tracking/config'

function clearCookies() {
  for (const c of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${c.split('=')[0]}=; Path=/; Max-Age=0`
  }
}

afterEach(() => {
  clearCookies()
  vi.unstubAllEnvs()
})

describe('pixel config', () => {
  it('is off when no pixel id is set, or the id is malformed', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    expect(pixelsConfigured()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '"123456789012345"')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'C4AB<script>')
    expect(metaPixelId()).toBeNull()
    expect(tiktokPixelId()).toBeNull()
    expect(pixelsConfigured()).toBe(false)
  })

  it('is on with either pixel id', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', ' 123456789012345 ')
    expect(metaPixelId()).toBe('123456789012345')
    expect(pixelsConfigured()).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'C4ABCDEF1234567890')
    expect(tiktokPixelId()).toBe('C4ABCDEF1234567890')
    expect(pixelsConfigured()).toBe(true)
  })
})

describe('consent cookie', () => {
  it('parses only an explicit answer', () => {
    expect(parseConsent('granted')).toBe('granted')
    expect(parseConsent('denied')).toBe('denied')
    expect(parseConsent('yes')).toBe('pending')
    expect(parseConsent(null)).toBe('pending')
    expect(parseConsentShared(undefined)).toBe('pending')
    expect(parseConsentShared(1)).toBe('pending')
  })

  it('is pending until answered, then remembers the answer in tl_consent', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    expect(getConsent()).toBe('pending')
    setConsent('granted')
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=granted`)
    expect(getConsent()).toBe('granted')
    setConsent('denied')
    expect(getConsent()).toBe('denied')
  })

  it('tells listeners when the choice changes', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    const onChange = vi.fn()
    window.addEventListener('tl-consent-change', onChange)
    setConsent('granted')
    window.removeEventListener('tl-consent-change', onChange)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('clears the pixels’ own cookies on decline', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    document.cookie = '_fbp=fb.1.123.456; Path=/'
    document.cookie = '_ttp=abc; Path=/'
    document.cookie = 'tl_utm=keep; Path=/'
    setConsent('denied')
    expect(document.cookie).not.toContain('_fbp=')
    expect(document.cookie).not.toContain('_ttp=')
    expect(document.cookie).toContain('tl_utm=keep')
  })

  it('reads as denied when no pixel is configured (no banner, nothing to load)', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    document.cookie = `${CONSENT_COOKIE}=granted; Path=/`
    expect(getConsent()).toBe('denied')
  })
})
