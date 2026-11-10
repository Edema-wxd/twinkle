import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { deleteUploadthingFilesByUrls } from '@/lib/uploadthing/server'
import { slugify } from '@/lib/content'
import { parseBlogInput, revalidateBlog } from '@/lib/content-api'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = parseBlogInput(raw)

  // Fetch current post to detect published transition + cleanup replaced featured image
  const [currentPost] = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      published: blogPosts.published,
      publishedAt: blogPosts.publishedAt,
      featuredImage: blogPosts.featuredImage,
    })
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1)

  if (!currentPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const updates: Partial<typeof blogPosts.$inferInsert> = {}

  if (input.title) updates.title = input.title
  if (input.slug) {
    const s = slugify(input.slug)
    if (s) updates.slug = s
  }
  if (input.body !== undefined) updates.body = input.body
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt
  if (input.featuredImage !== undefined) updates.featuredImage = input.featuredImage
  if (input.tag !== undefined) updates.tag = input.tag
  if (input.seoTitle !== undefined) updates.seoTitle = input.seoTitle
  if (input.seoDescription !== undefined) updates.seoDescription = input.seoDescription
  if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured
  if (input.featuredProductIds !== undefined) updates.featuredProductIds = input.featuredProductIds

  if (input.published !== undefined) {
    updates.published = input.published
    // Auto-set publishedAt when transitioning from unpublished to published
    if (input.published && !currentPost.published) {
      updates.publishedAt = input.publishedAt ?? new Date()
    }
  }
  // Explicit date change (backdating / correcting) on an already-published post
  if (input.publishedAt && currentPost.published && input.published !== false) {
    updates.publishedAt = input.publishedAt
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

    if (data.isFeatured) {
      await db
        .update(blogPosts)
        .set({ isFeatured: false })
        .where(and(ne(blogPosts.id, data.id), eq(blogPosts.isFeatured, true)))
    }

    // Delete replaced/removed featured image (best-effort).
    const previous = currentPost.featuredImage
    const next = input.featuredImage === undefined ? previous : input.featuredImage
    if (previous && previous !== next) {
      try {
        await deleteUploadthingFilesByUrls([previous])
      } catch (err) {
        console.error('UploadThing cleanup failed (blog featured image):', err)
      }
    }

    revalidateBlog(currentPost.slug, data.slug)
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
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const [before] = await db
      .select({ featuredImage: blogPosts.featuredImage, slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1)

    await db.delete(blogPosts).where(eq(blogPosts.id, id))

    if (before?.featuredImage) {
      try {
        await deleteUploadthingFilesByUrls([before.featuredImage])
      } catch (err) {
        console.error('UploadThing cleanup failed (blog delete):', err)
      }
    }

    revalidateBlog(before?.slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete blog post:', err)
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }
}
