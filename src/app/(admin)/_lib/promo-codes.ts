import { desc, eq, sql } from 'drizzle-orm'
import { db, promoCodes } from '@/db'
import { WELCOME_OFFER_SOURCE } from '@/lib/landing/welcomeOffer'

/**
 * Promo code lists for Admin → Promo Codes.
 *
 * The ad landing page issues one single-use welcome code per email signup
 * (source = 'welcome'), so they pile up fast. They're kept out of the main list
 * and summarised instead; the admin can still open the full welcome list.
 */

/** Most welcome codes the admin list loads at once (newest first) */
export const WELCOME_LIST_LIMIT = 500

export type PromoCodeRow = typeof promoCodes.$inferSelect

export type WelcomeCodeSummary = { issued: number; used: number }

/** Codes made in Admin (everything except landing page welcome codes), oldest first */
export function listAdminPromoCodes(): Promise<PromoCodeRow[]> {
  return db
    .select()
    .from(promoCodes)
    .where(sql`${promoCodes.source} is distinct from ${WELCOME_OFFER_SOURCE}`)
    .orderBy(promoCodes.createdAt)
}

/** Welcome codes issued by the landing page, newest first */
export function listWelcomeCodes(): Promise<PromoCodeRow[]> {
  return db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.source, WELCOME_OFFER_SOURCE))
    .orderBy(desc(promoCodes.createdAt))
    .limit(WELCOME_LIST_LIMIT)
}

/** How many welcome codes were issued, and how many of those were used at checkout */
export async function welcomeCodeSummary(): Promise<WelcomeCodeSummary> {
  const [row] = await db
    .select({
      issued: sql<number>`count(*)::int`,
      used: sql<number>`(count(*) filter (where ${promoCodes.currentUses} > 0))::int`,
    })
    .from(promoCodes)
    .where(eq(promoCodes.source, WELCOME_OFFER_SOURCE))
  return { issued: Number(row?.issued ?? 0), used: Number(row?.used ?? 0) }
}

/**
 * Minimum order from a request body: null when blank or 0 (no minimum),
 * a whole number of naira otherwise. undefined = not valid.
 */
export function parseMinOrder(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) return undefined
  return n === 0 ? null : n
}
