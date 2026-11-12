import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn(async () => ({ ok: true, id: 'm1', logId: 'l1' })) }))

import { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl, unsubscribeHeaders } from '@/lib/newsletter/unsubscribe'
import { sendNewsletterEmail } from '@/lib/newsletter/send'
import { sendEmail } from '@/lib/email/client'

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-unsubscribe-tokens')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com')
})

describe('unsubscribe tokens', () => {
  it('verifies a token made for the same email (any capitalisation)', () => {
    const t = unsubscribeToken('Ada@Example.com')
    expect(verifyUnsubscribeToken('ada@example.com', t)).toBe(true)
  })

  it('rejects a token for a different email or a tampered token', () => {
    const t = unsubscribeToken('ada@example.com')
    expect(verifyUnsubscribeToken('bisi@example.com', t)).toBe(false)
    expect(verifyUnsubscribeToken('ada@example.com', t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'))).toBe(false)
    expect(verifyUnsubscribeToken('ada@example.com', '')).toBe(false)
  })

  it('changes when the secret changes', () => {
    const t = unsubscribeToken('ada@example.com')
    vi.stubEnv('NEWSLETTER_SECRET', 'a-different-secret')
    expect(verifyUnsubscribeToken('ada@example.com', t)).toBe(false)
    vi.unstubAllEnvs()
  })

  it('builds the page link and one-click headers', () => {
    expect(unsubscribeUrl('ada@example.com')).toMatch(/^https:\/\/twinklelocs\.com\/unsubscribe\?e=ada%40example\.com&t=[\w-]+$/)
    const h = unsubscribeHeaders('ada@example.com')
    expect(h['List-Unsubscribe']).toMatch(/^<https:\/\/twinklelocs\.com\/api\/newsletter\/unsubscribe\?e=ada%40example\.com&t=[\w-]+>, <mailto:/)
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
})

describe('sendNewsletterEmail', () => {
  it('always adds the unsubscribe footer and headers', async () => {
    await sendNewsletterEmail({ to: 'ada@example.com', subject: 'New styles', html: '<p>Hi</p>', text: 'Hi' })
    const arg = vi.mocked(sendEmail).mock.calls[0][0]
    expect(arg.category).toBe('newsletter')
    expect(arg.html).toContain('/unsubscribe?e=ada%40example.com&amp;t=')
    expect(arg.text).toMatch(/Unsubscribe: https:\/\/twinklelocs\.com\/unsubscribe\?e=/)
    expect(arg.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
})
