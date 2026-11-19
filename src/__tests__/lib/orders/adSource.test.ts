import { describe, it, expect } from 'vitest'
import { utmFromPayload, utmRows } from '@/lib/orders/adSource'

describe('ad source from the saved Paystack payload', () => {
  it('reads the UTM tags checkout put in the metadata', () => {
    const payload = { reference: 'tw-1', metadata: { cart_items: [], utm: { source: 'facebook', medium: 'paid', campaign: 'nov-launch', content: 'gold-video-1' } } }
    expect(utmFromPayload(payload)).toEqual({ source: 'facebook', medium: 'paid', campaign: 'nov-launch', content: 'gold-video-1' })
  })

  it('also reads metadata that Paystack returned as a JSON string', () => {
    expect(utmFromPayload({ metadata: JSON.stringify({ utm: { source: 'tiktok' } }) })).toEqual({ source: 'tiktok' })
  })

  it('is null for orders without tags, and drops anything unexpected', () => {
    expect(utmFromPayload({ metadata: { cart_items: [] } })).toBeNull()
    expect(utmFromPayload({ metadata: { utm: null } })).toBeNull()
    expect(utmFromPayload({ metadata: { utm: { source: '  ', evil: 'x', medium: 42 } } })).toBeNull()
    expect(utmFromPayload(null)).toBeNull()
    expect(utmFromPayload('garbage')).toBeNull()
    expect(utmFromPayload({ metadata: { utm: { source: 'ig', evil: '<b>' } } })).toEqual({ source: 'ig' })
  })

  it('lists the tags in a fixed order with labels', () => {
    expect(utmRows({ content: 'gold-video-1', source: 'facebook' })).toEqual([
      ['Source', 'facebook'],
      ['Ad (content)', 'gold-video-1'],
    ])
    expect(utmRows(null)).toEqual([])
  })
})
