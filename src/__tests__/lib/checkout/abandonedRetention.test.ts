import { describe, it, expect, vi } from 'vitest'

const { calls } = vi.hoisted(() => ({ calls: [] as unknown[] }))
vi.mock('@/db', () => ({
  db: { delete: vi.fn(() => ({ where: vi.fn((cond: unknown) => { calls.push(cond); return { returning: async () => [{ id: 'a' }, { id: 'b' }] } }) })) },
  abandonedOrders: { createdAt: 'created_at', id: 'id' },
}))
vi.mock('drizzle-orm', () => ({ lt: vi.fn((col, value) => ({ col, value })) }))

import { abandonedCutoff, deleteExpiredAbandonedOrders, ABANDONED_RETENTION_DAYS } from '@/lib/checkout/abandonedRetention'

describe('abandoned checkout retention', () => {
  it('keeps 90 days, as the privacy policy says', () => {
    expect(ABANDONED_RETENTION_DAYS).toBe(90)
    expect(abandonedCutoff(new Date('2026-11-12T10:00:00Z')).toISOString()).toBe('2026-08-14T10:00:00.000Z')
  })

  it('deletes rows created before the cutoff and reports how many', async () => {
    const n = await deleteExpiredAbandonedOrders(new Date('2026-11-12T10:00:00Z'))
    expect(n).toBe(2)
    expect(calls[0]).toEqual({ col: 'created_at', value: new Date('2026-08-14T10:00:00.000Z') })
  })
})
