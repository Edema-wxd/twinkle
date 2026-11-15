import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real Postgres for the email log and the status-email claim table; Resend is faked.
vi.mock('@/db', () => import('../helpers/pgliteDb'))

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { db, resetDb, emailLogs, orders } from '../helpers/pgliteDb'
import { sendEmail } from '@/lib/email/client'
import { sendCustomerEmail, tryClaimStatusEmail, releaseStatusEmailClaim } from '@/lib/notifications/customerEmail'

const base = { to: 'ada@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi', category: 'order' as const }
const ok = (id: string) => ({ data: { id }, error: null })
const err = (name: string, message: string) => ({ data: null, error: { name, message } })

beforeEach(async () => {
  await resetDb()
  send.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('RESEND_FROM', 'Twinkle Locs <hello@twinklelocs.com>')
  vi.stubEnv('EMAIL_REPLY_TO', 'hello@twinklelocs.com')
})

describe('sendEmail (real email log)', () => {
  it('sends and logs it with Resend’s id, the bodies and the reply-to', async () => {
    send.mockResolvedValueOnce(ok('msg_1'))
    const r = await sendEmail({ ...base, templateKey: 'confirmed', idempotencyKey: 'order:tw-1:confirmed' })
    expect(r).toMatchObject({ ok: true, id: 'msg_1' })
    const [payload, opts] = send.mock.calls[0]
    expect(payload).toMatchObject({ from: 'Twinkle Locs <hello@twinklelocs.com>', to: ['ada@example.com'], replyTo: 'hello@twinklelocs.com' })
    expect(payload.tags).toEqual([{ name: 'category', value: 'order' }, { name: 'template', value: 'confirmed' }])
    expect(opts).toEqual({ idempotencyKey: 'order:tw-1:confirmed' })
    const [log] = await db.select().from(emailLogs)
    expect(log).toMatchObject({ to: ['ada@example.com'], subject: 'Hello', status: 'sent', resendMessageId: 'msg_1', htmlBody: '<p>Hi</p>', textBody: 'Hi', templateKey: 'confirmed' })
    expect(log.sentAt).toBeInstanceOf(Date)
  })

  it('retries when Resend is busy, then logs one success', async () => {
    send.mockResolvedValueOnce(err('rate_limit_exceeded', 'Too many requests')).mockResolvedValueOnce(ok('msg_2'))
    expect((await sendEmail(base)).ok).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
    const logs = await db.select().from(emailLogs)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ status: 'sent', resendMessageId: 'msg_2', error: null })
  })

  it('does not retry a permanent error, and logs it as failed', async () => {
    send.mockResolvedValueOnce(err('validation_error', 'Invalid `to` field.'))
    const r = await sendEmail(base)
    expect(r).toMatchObject({ ok: false, error: 'Invalid `to` field.' })
    expect(send).toHaveBeenCalledTimes(1)
    const [log] = await db.select().from(emailLogs)
    expect(log).toMatchObject({ status: 'failed', error: 'Invalid `to` field.', sentAt: null })
  })

  it('reports (and logs) missing email settings instead of throwing', async () => {
    vi.stubEnv('RESEND_FROM', '')
    const r = await sendEmail(base)
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/RESEND_FROM is missing/) })
    expect(send).not.toHaveBeenCalled()
    expect((await db.select().from(emailLogs))[0].status).toBe('failed')
  })

  it('records the subject as written when one is given (newsletters keep {name})', async () => {
    send.mockResolvedValueOnce(ok('msg_3'))
    await sendEmail({ ...base, subject: 'Hi Ada', logSubject: 'Hi {name}', headers: { 'List-Unsubscribe': '<https://x>' } })
    expect(send.mock.calls[0][0]).toMatchObject({ subject: 'Hi Ada', headers: { 'List-Unsubscribe': '<https://x>' } })
    expect((await db.select().from(emailLogs))[0].subject).toBe('Hi {name}')
  })
})

describe('order status emails (real database)', () => {
  async function anOrder() {
    const [o] = await db
      .insert(orders)
      .values({
        paystackReference: 'tw-100',
        paystackPayload: {},
        customerName: 'Ada Obi',
        customerEmail: 'ada@example.com',
        customerPhone: '0803',
        deliveryAddress: '1 Allen',
        deliveryState: 'Lagos',
        shippingCost: 3000,
        subtotal: 15000,
        total: 18000,
      })
      .returning({ id: orders.id })
    return o.id
  }

  it('only one caller can claim a status email, until the claim is released', async () => {
    const orderId = await anOrder()
    const [a, b] = await Promise.all([tryClaimStatusEmail(orderId, 'shipped'), tryClaimStatusEmail(orderId, 'shipped')])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    await releaseStatusEmailClaim((a ?? b)!)
    expect(await tryClaimStatusEmail(orderId, 'shipped')).not.toBeNull()
  })

  it('sends the customer email with a per-order key, and a forced re-send without one', async () => {
    const orderId = await anOrder()
    send.mockResolvedValue(ok('msg_4'))
    await sendCustomerEmail({ to: 'ada@example.com', customerName: 'Ada Obi', orderReference: 'tw-100', totalNaira: 18000, event: 'shipped', trackingNumber: 'GIG1', orderId })
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: 'order:tw-100:shipped' })
    expect(send.mock.calls[0][0].subject).toMatch(/on its way/)
    await sendCustomerEmail({ to: 'ada@example.com', customerName: 'Ada Obi', orderReference: 'tw-100', totalNaira: 18000, event: 'shipped', orderId, force: true })
    expect(send.mock.calls[1][1]).toBeUndefined()
    const logs = await db.select().from(emailLogs)
    expect(logs.map((l) => l.orderId)).toEqual([orderId, orderId])
  })

  it('throws when the email can’t be sent, so the caller can release its claim and retry later', async () => {
    send.mockResolvedValue(err('validation_error', 'Invalid `to` field.'))
    await expect(sendCustomerEmail({ to: 'bad', customerName: 'Ada', orderReference: 'tw-101', totalNaira: 1, event: 'confirmed' })).rejects.toThrow(/Invalid/)
  })
})
