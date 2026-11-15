import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Real Postgres for scheduling, staged edits and history; auth and file cleanup are faked.
vi.mock('@/db', () => import('../helpers/pgliteDb'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/uploadthing/server', () => ({ deleteUploadthingFilesByUrls: vi.fn() }))
vi.mock('@/lib/auth/server', () => ({
  getAdminSession: vi.fn(async () => ({ user: { name: 'Unoma', email: 'unoma@example.com' } })),
}))

import { asc, eq } from 'drizzle-orm'
import { db, resetDb, blogPosts, blogPostRevisions } from '../helpers/pgliteDb'
import { isLivePost } from '@/lib/blog/live'
import { KEEP_REVISIONS, listRevisions, recordRevision, snapshotOf } from '@/lib/blog/revisions'
import { POST } from '@/app/api/admin/blog/route'
import { PUT } from '@/app/api/admin/blog/[id]/route'

const json = (url: string, method: string, body: object) =>
  new NextRequest(`http://localhost${url}`, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

async function create(body: object) {
  const res = await POST(json('/api/admin/blog', 'POST', { title: 'Caring for gold beads', body: '<p>One two three</p>', ...body }))
  expect(res.status).toBe(201)
  return ((await res.json()) as { post: { id: string } }).post.id
}
const put = (id: string, body: object) => PUT(json(`/api/admin/blog/${id}`, 'PUT', body), { params: Promise.resolve({ id }) })
const row = async (id: string) => (await db.select().from(blogPosts).where(eq(blogPosts.id, id)))[0]
const liveTitles = async () => (await db.select({ title: blogPosts.title }).from(blogPosts).where(isLivePost())).map((r) => r.title)

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await resetDb()
})

describe('scheduled posts', () => {
  it('a post published with a future date stays off the site until then', async () => {
    const soon = new Date(Date.now() + 86_400_000).toISOString()
    const id = await create({ title: 'Coming soon', published: true, published_at: soon })
    await create({ title: 'Out now', published: true })
    await create({ title: 'Still a draft' })
    expect(await liveTitles()).toEqual(['Out now'])

    // The date arrives
    await db.update(blogPosts).set({ publishedAt: new Date(Date.now() - 1000) }).where(eq(blogPosts.id, id))
    expect((await liveTitles()).sort()).toEqual(['Coming soon', 'Out now'])
  })

  it('stores the word count on create and on save', async () => {
    const id = await create({ body: '<p>Five little words right here</p>' })
    expect((await row(id)).wordCount).toBe(5)
    await put(id, { body: '<p>Now just three</p>' })
    expect((await row(id)).wordCount).toBe(3)
  })
})

describe('saving changes for later on a live post', () => {
  it('keeps the live version, stores the edits, then publishes or discards them', async () => {
    const id = await create({ published: true })
    const staged = await put(id, { mode: 'stage', title: 'Caring for gold beads (updated)', body: '<p>New text</p>' })
    expect(staged.status).toBe(200)

    let p = await row(id)
    expect(p.title).toBe('Caring for gold beads')
    expect(p.body).toBe('<p>One two three</p>')
    expect(p.pendingChanges).toMatchObject({ title: 'Caring for gold beads (updated)', body: '<p>New text</p>', savedBy: 'Unoma' })

    await put(id, { discard_pending: true })
    expect((await row(id)).pendingChanges).toBeNull()

    await put(id, { mode: 'stage', title: 'Second try' })
    await put(id, { title: 'Second try', published: true })
    p = await row(id)
    expect(p.title).toBe('Second try')
    expect(p.pendingChanges).toBeNull()
  })

  it('refuses to stage on a draft', async () => {
    const id = await create({})
    expect((await put(id, { mode: 'stage', title: 'x' })).status).toBe(400)
  })
})

describe('history', () => {
  it('records each save with a label and who made it, skipping repeat saves', async () => {
    const id = await create({})
    await put(id, { title: 'Draft two' })
    await put(id, { title: 'Draft two' }) // nothing changed
    await put(id, { published: true })
    await put(id, { mode: 'stage', body: '<p>Later</p>' })
    const revs = await listRevisions(id)
    expect(revs.map((r) => r.label)).toEqual(['Changes saved for later (not live yet)', 'Published', 'Draft saved', 'Draft saved'])
    expect(revs.every((r) => r.createdBy === 'Unoma')).toBe(true)
    expect(revs[0].words).toBe(1)
    expect(revs[2].title).toBe('Draft two')
  })

  it(`keeps only the latest ${KEEP_REVISIONS}`, async () => {
    const id = await create({})
    const snap = snapshotOf(await row(id))
    for (let i = 0; i < KEEP_REVISIONS + 5; i++) await recordRevision(id, 'Draft saved', { ...snap, title: `v${i}` }, null)
    const rows = await db.select({ snapshot: blogPostRevisions.snapshot }).from(blogPostRevisions).where(eq(blogPostRevisions.postId, id)).orderBy(asc(blogPostRevisions.createdAt))
    expect(rows).toHaveLength(KEEP_REVISIONS)
    expect((rows.at(-1)!.snapshot as { title: string }).title).toBe(`v${KEEP_REVISIONS + 4}`)
  })

  it('deleting a post deletes its history', async () => {
    const id = await create({})
    await db.delete(blogPosts).where(eq(blogPosts.id, id))
    expect(await db.$count(blogPostRevisions)).toBe(0)
  })
})
