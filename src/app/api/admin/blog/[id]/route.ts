import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { eq } from 'drizzle-orm'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, slug, body: postBody, excerpt, featured_image, tag, published, published_at } = body as {
    title?: unknown
    slug?: unknown
    body?: unknown
    excerpt?: unknown
    featured_image?: unknown
    tag?: unknown
    published?: unknown
    published_at?: unknown
  }

  // Fetch current post to detect published transition
  const [currentPost] = await db
    .select({ id: blogPosts.id, published: blogPosts.published, publishedAt: blogPosts.publishedAt })
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1)

  if (!currentPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof title === 'string' && title.trim() !== '') {
    updates.title = title.trim()
  }
  if (typeof slug === 'string' && slug.trim() !== '') {
    updates.slug = slug.trim()
  }
  if (typeof postBody === 'string') {
    updates.body = postBody
  }
  if (typeof excerpt === 'string') {
    updates.excerpt = excerpt
  }
  if (featured_image === null || (typeof featured_image === 'string')) {
    updates.featuredImage = featured_image || null
  }
  if (tag === null || typeof tag === 'string') {
    updates.tag = typeof tag === 'string' && tag.trim() ? tag.trim() : null
  }
  if (typeof published === 'boolean') {
    updates.published = published

    // Auto-set publishedAt when transitioning from unpublished to published
    if (published && !currentPost.published) {
      updates.publishedAt =
        typeof published_at === 'string' && published_at
          ? new Date(published_at)
          : new Date()
    }
  }

  updates.updatedAt = new Date()

  try {
    const [data] = await db
      .update(blogPosts)
      .set(updates)
      .where(eq(blogPosts.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, post: data })
  } catch (err: unknown) {
    console.error('Failed to update blog post:', err)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete blog post:', err)
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }
}
