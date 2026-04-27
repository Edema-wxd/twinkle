import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { blogPosts } from '@/db'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, slug: rawSlug, body: postBody, excerpt, featured_image, tag, published, published_at } = body as {
    title?: unknown
    slug?: unknown
    body?: unknown
    excerpt?: unknown
    featured_image?: unknown
    tag?: unknown
    published?: unknown
    published_at?: unknown
  }

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const trimmedTitle = title.trim()
  const slug =
    rawSlug && typeof rawSlug === 'string' && rawSlug.trim() !== ''
      ? rawSlug.trim()
      : generateSlug(trimmedTitle)

  if (!slug) {
    return NextResponse.json({ error: 'slug could not be generated from title' }, { status: 400 })
  }

  const isPublished = typeof published === 'boolean' ? published : false

  // Auto-set published_at when publishing and not explicitly provided
  const resolvedPublishedAt =
    isPublished
      ? (typeof published_at === 'string' && published_at ? new Date(published_at) : new Date())
      : null

  try {
    const [data] = await db.insert(blogPosts).values({
      title: trimmedTitle,
      slug,
      body: typeof postBody === 'string' ? postBody : '',
      excerpt: typeof excerpt === 'string' ? excerpt : '',
      featuredImage: typeof featured_image === 'string' && featured_image ? featured_image : null,
      tag: typeof tag === 'string' && tag.trim() ? tag.trim() : null,
      published: isPublished,
      publishedAt: resolvedPublishedAt,
    }).returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Failed to create blog post:', err)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
