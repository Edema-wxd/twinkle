import { describe, it, expect } from 'vitest'
import { GET as lp } from '@/app/lp/route'
import { GET as lpHero } from '@/app/lp/[key]/route'

describe('/lp short ad links', () => {
  it('308s to /shop-twinkles keeping the UTM tags', async () => {
    const res = lp(new Request('https://twinklelocs.com/lp?utm_source=instagram&utm_campaign=nov&utm_content=gold-video-1'))
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe('/shop-twinkles?utm_source=instagram&utm_campaign=nov&utm_content=gold-video-1')
  })

  it('works without a query string', async () => {
    expect(lp(new Request('https://twinklelocs.com/lp')).headers.get('location')).toBe('/shop-twinkles')
  })

  it('/lp/<key> goes to that hero version, query kept', async () => {
    const res = await lpHero(new Request('https://twinklelocs.com/lp/gold-video?utm_source=tiktok'), { params: Promise.resolve({ key: 'gold-video' }) })
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe('/shop-twinkles/gold-video?utm_source=tiktok')
  })

  it('never builds a link to another site from the key', async () => {
    const res = await lpHero(new Request('https://twinklelocs.com/lp/x'), { params: Promise.resolve({ key: '//evil.example/a' }) })
    expect(res.headers.get('location')).toBe('/shop-twinkles/%2F%2Fevil.example%2Fa')
  })
})
