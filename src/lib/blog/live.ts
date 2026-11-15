import { and, eq, isNull, lte, or, sql } from 'drizzle-orm'
import { blogPosts } from '@/db/schema'

/**
 * A post is live (shown on the site) when it's published and its publish date
 * has arrived. Published with a future date = scheduled: saved, not shown yet.
 * Every public query must use this, so a scheduled post can't leak early.
 */
export function isLivePost() {
  return and(eq(blogPosts.published, true), or(isNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, sql`now()`)))
}

/** Same rule for a row already loaded (admin lists, status badges). */
export function postState(p: { published: boolean; publishedAt: Date | string | null }, now = new Date()): 'draft' | 'scheduled' | 'live' {
  if (!p.published) return 'draft'
  if (p.publishedAt && new Date(p.publishedAt).getTime() > now.getTime()) return 'scheduled'
  return 'live'
}

/** The label for a save, from the post's state before and after. */
export function revisionLabel(
  before: { published: boolean; publishedAt?: Date | string | null } | null,
  after: { published: boolean; publishedAt: Date | string | null },
  staged = false,
): string {
  if (staged) return 'Changes saved for later (not live yet)'
  const was = before ? postState({ published: before.published, publishedAt: before.publishedAt ?? null }) : null
  const now = postState(after)
  if (now === 'draft') return was && was !== 'draft' ? 'Unpublished' : 'Draft saved'
  if (now === 'scheduled') return was === 'scheduled' ? 'Schedule updated' : 'Scheduled'
  return was === 'live' ? 'Live post updated' : 'Published'
}
