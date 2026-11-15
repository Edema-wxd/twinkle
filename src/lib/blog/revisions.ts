import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import { db, blogPostRevisions, blogPosts } from '@/db'

/** What a revision stores: everything an editor can change. */
export type BlogSnapshot = {
  title: string
  slug: string
  excerpt: string
  body: string
  featuredImage: string | null
  tag: string | null
  seoTitle: string | null
  seoDescription: string | null
  isFeatured: boolean
  featuredProductIds: string[]
  published: boolean
  publishedAt: string | null
}

export const KEEP_REVISIONS = 50

// Postgres jsonb reorders keys, so compare with keys sorted
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x))
const sameSnapshot = (a: unknown, b: unknown) => stable(a) === stable(b)

export function snapshotOf(p: typeof blogPosts.$inferSelect): BlogSnapshot {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    featuredImage: p.featuredImage ?? null,
    tag: p.tag ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    isFeatured: p.isFeatured,
    featuredProductIds: p.featuredProductIds ?? [],
    published: p.published,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
  }
}

/**
 * Save a version. Skipped when nothing changed since the last one (e.g. pressing
 * Save twice), and older versions beyond KEEP_REVISIONS are dropped.
 * Never throws: history is a safety net and must not block saving the post.
 */
export async function recordRevision(postId: string, label: string, snapshot: BlogSnapshot, createdBy?: string | null): Promise<void> {
  try {
    const [latest] = await db
      .select({ snapshot: blogPostRevisions.snapshot, label: blogPostRevisions.label })
      .from(blogPostRevisions)
      .where(eq(blogPostRevisions.postId, postId))
      .orderBy(desc(blogPostRevisions.createdAt))
      .limit(1)
    if (latest && latest.label === label && sameSnapshot(latest.snapshot, snapshot)) return

    await db.insert(blogPostRevisions).values({ postId, label, snapshot, createdBy: createdBy ?? null })

    const keep = db
      .select({ id: blogPostRevisions.id })
      .from(blogPostRevisions)
      .where(eq(blogPostRevisions.postId, postId))
      .orderBy(desc(blogPostRevisions.createdAt))
      .limit(KEEP_REVISIONS)
    const keepIds = (await keep).map((r) => r.id)
    if (keepIds.length >= KEEP_REVISIONS) {
      await db.delete(blogPostRevisions).where(and(eq(blogPostRevisions.postId, postId), notInArray(blogPostRevisions.id, keepIds)))
    }
  } catch (err) {
    console.error('[blog] failed to record revision:', err)
  }
}

export async function listRevisions(postId: string) {
  const rows = await db
    .select({ id: blogPostRevisions.id, label: blogPostRevisions.label, createdAt: blogPostRevisions.createdAt, createdBy: blogPostRevisions.createdBy, snapshot: blogPostRevisions.snapshot })
    .from(blogPostRevisions)
    .where(eq(blogPostRevisions.postId, postId))
    .orderBy(desc(blogPostRevisions.createdAt))
    .limit(KEEP_REVISIONS)
  return rows.map((r) => {
    const s = r.snapshot as BlogSnapshot
    return { id: r.id, label: r.label, createdAt: r.createdAt.toISOString(), createdBy: r.createdBy, title: s.title, words: s.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length }
  })
}

export async function getRevision(postId: string, revisionId: string): Promise<BlogSnapshot | null> {
  const [row] = await db
    .select({ snapshot: blogPostRevisions.snapshot })
    .from(blogPostRevisions)
    .where(and(eq(blogPostRevisions.postId, postId), inArray(blogPostRevisions.id, [revisionId])))
    .limit(1)
  return (row?.snapshot as BlogSnapshot | undefined) ?? null
}

export { revisionLabel } from './live'
