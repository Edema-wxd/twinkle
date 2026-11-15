import { describe, it, expect, vi } from 'vitest'

vi.mock('@/db', () => import('../helpers/pgliteDb'))

import { db, products, resetDb, pg } from '../helpers/pgliteDb'

describe('test database', () => {
  it('has every table from the schema and can be reset', async () => {
    const { rows } = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`)
    expect(rows[0].n).toBeGreaterThan(15)
    await db.insert(products).values({ name: 'X', slug: 'x', description: '', material: 'Gold', variants: [], priceMin: 1, priceMax: 1 })
    expect(await db.$count(products)).toBe(1)
    await resetDb()
    expect(await db.$count(products)).toBe(0)
  })
})
