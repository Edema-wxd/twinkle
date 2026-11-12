import { NextRequest, NextResponse } from 'next/server'
import { ne } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { slugify } from '@/lib/content'
import { parseBlogInput, revalidateBlog } from '@/lib/content-api'
import { isUniqueViolation } from '@/lib/db/errors'

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = parseBlogInput(raw)

  if (!input.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const slug = slugify(input.slug || input.title)
  if (!slug) {
    return NextResponse.json({ error: 'slug could not be generated from title' }, { status: 400 })
  }

  const isPublished = input.published ?? false
  // Auto-set published_at when publishing and not explicitly provided
  const publishedAt = isPublished ? (input.publishedAt ?? new Date()) : null

  try {
    const [data] = await db
      .insert(blogPosts)
      .values({
        title: input.title,
        slug,
        body: input.body ?? '',
        excerpt: input.excerpt ?? '',
        featuredImage: input.featuredImage ?? null,
        tag: input.tag ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        isFeatured: input.isFeatured ?? false,
        featuredProductIds: input.featuredProductIds ?? [],
        published: isPublished,
        publishedAt,
      })
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
    }

    // Only one post holds the hero slot on /blog
    if (data.isFeatured && data.published) {
      await db.update(blogPosts).set({ isFeatured: false }).where(ne(blogPosts.id, data.id))
    }

    revalidateBlog(data.slug)
    return NextResponse.json({ post: data }, { status: 201 })
  } catch (err: unknown) {
    console.error('Failed to create blog post:', err)
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Another post already uses this web address. Change it under Search & sharing.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
