import { lt } from 'drizzle-orm'
import { db, abandonedOrders } from '@/db'

/**
 * Unfinished checkouts are only kept while they're useful for following up.
 * The privacy policy (/privacy) promises this; change both together.
 */
export const ABANDONED_RETENTION_DAYS = 90

export function abandonedCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - ABANDONED_RETENTION_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Delete unfinished checkouts older than the retention period. Runs whenever a
 * new one is saved and when the admin opens Abandoned Orders, so it needs no
 * scheduled job or extra configuration. Returns how many were deleted.
 */
export async function deleteExpiredAbandonedOrders(now: Date = new Date()): Promise<number> {
  const deleted = await db
    .delete(abandonedOrders)
    .where(lt(abandonedOrders.createdAt, abandonedCutoff(now)))
    .returning({ id: abandonedOrders.id })
  return deleted.length
}
