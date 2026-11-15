/**
 * A real Postgres for tests: PGlite runs in-process (no server, no Docker), and
 * the tables are generated from src/db/schema.ts by drizzle-kit, so tests always
 * match the real schema. Use it in place of the Neon client:
 *
 *   vi.mock('@/db', () => import('../helpers/pgliteDb'))
 *   import { resetDb } from '../helpers/pgliteDb'
 *   beforeEach(resetDb)
 *
 * Each test file gets its own fresh database (vitest isolates modules per file).
 */
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import * as schema from '@/db/schema'

export const pg = new PGlite()

const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
for (const statement of statements) await pg.exec(statement)

export const db = drizzle(pg, { schema })
export * from '@/db/schema'

/** Empty every table (fast enough to run before each test). */
export async function resetDb() {
  const { rows } = await pg.query<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
  if (rows.length) await pg.exec(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
}
