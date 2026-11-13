import { describe, it, expect, vi, beforeEach } from 'vitest'

const { state } = vi.hoisted(() => ({ state: { row: null as { value: string } | null, sentLastHour: 0 } }))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn((cols?: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          const rows = cols && 'n' in cols ? [{ n: state.sentLastHour }] : state.row ? [state.row] : []
          return Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) })
        },
      }),
    })),
    insert: vi.fn(() => ({ values: () => ({ onConflictDoUpdate: async () => {} }) })),
  },
  settings: { key: 'key', value: 'value' },
  emailLogs: { templateKey: 'template_key', createdAt: 'created_at' },
}))
vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn(async () => ({ ok: true, id: 'm1', logId: 'l1' })) }))

import { sendWelcomeEmail, getWelcomeSettings, DEFAULT_WELCOME, WELCOME_HOURLY_LIMIT } from '@/lib/newsletter/welcome'
import { sendEmail } from '@/lib/email/client'

beforeEach(() => {
  vi.mocked(sendEmail).mockClear()
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-unsubscribe-tokens')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com')
  state.row = null
  state.sentLastHour = 0
})

describe('welcome email', () => {
  it('uses the default wording until the admin saves their own', async () => {
    expect(await getWelcomeSettings()).toEqual(DEFAULT_WELCOME)
  })

  it('sends a personalised welcome with the unsubscribe link and headers, once per address', async () => {
    expect(await sendWelcomeEmail('Ada@Example.com', 'Ada')).toBe('sent')
    const arg = vi.mocked(sendEmail).mock.calls[0][0]
    expect(arg.subject).toBe('Welcome to the Twinkle family, Ada')
    expect(arg.html).toContain('Hi Ada,')
    expect(arg.html).toMatch(/\/unsubscribe\?e=ada%40example\.com&amp;t=/)
    expect(arg.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(arg.idempotencyKey).toBe('newsletter_welcome:ada@example.com')
    expect(arg.logSubject).toBe('Welcome to the Twinkle family, {name}')
  })

  it('uses the admin’s saved version', async () => {
    state.row = { value: JSON.stringify({ enabled: true, content: { subject: 'Hey {name}!', bodyHtml: '<p>Custom</p>' } }) }
    await sendWelcomeEmail('ada@example.com', 'Ada')
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toBe('Hey Ada!')
  })

  it('sends nothing when switched off', async () => {
    state.row = { value: JSON.stringify({ ...DEFAULT_WELCOME, enabled: false }) }
    expect(await sendWelcomeEmail('ada@example.com', 'Ada')).toBe('disabled')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('pauses after an unusual burst of sign-ups', async () => {
    state.sentLastHour = WELCOME_HOURLY_LIMIT
    expect(await sendWelcomeEmail('ada@example.com', 'Ada')).toBe('throttled')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
