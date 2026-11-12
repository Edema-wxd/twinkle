import { describe, it, expect } from 'vitest'
import { customerWhatsAppUrl } from '@/lib/contact/whatsapp'

describe('customerWhatsAppUrl', () => {
  it.each([
    ['08031112222', '2348031112222'],
    ['0803 111 2222', '2348031112222'],
    ['+234 803 111 2222', '2348031112222'],
    ['2340803111222 2', '2348031112222'],
    ['002348031112222', '2348031112222'],
    ['8031112222', '2348031112222'],
    ['+44 7700 900123', '447700900123'],
  ])('%s → wa.me/%s', (input, expected) => {
    expect(customerWhatsAppUrl(input)).toBe(`https://wa.me/${expected}`)
  })

  it('adds the message', () => {
    expect(customerWhatsAppUrl('08031112222', 'Hi Kemi')).toBe('https://wa.me/2348031112222?text=Hi%20Kemi')
  })

  it('returns null for numbers that cannot work', () => {
    expect(customerWhatsAppUrl('12345')).toBeNull()
    expect(customerWhatsAppUrl('')).toBeNull()
  })
})
