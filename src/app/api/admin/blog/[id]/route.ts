import { NextRequest, NextResponse } from 'next/server'
import { and, eq, like, ne, sql } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { deleteUploadthingFilesByUrls } from '@/lib/uploadthing/server'
import { slugify } from '@/lib/content'
import { bodyImageUrls, isUuid, parseBlogInput, revalidateBlog } from '@/lib/content-api'

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
  if (!isUuid(id)) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

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
      previousSlugs: blogPosts.previousSlugs,
      body: blogPosts.body,
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
    if (s && s !== currentPost.slug) {
      updates.slug = s
      // Remember the old address so links already shared on WhatsApp/Instagram keep working
      if (currentPost.published || currentPost.publishedAt) {
        updates.previousSlugs = [...new Set([...(currentPost.previousSlugs ?? []), currentPost.slug])].filter((x) => x !== s)
      }
    }
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

    // Only a live post may take the hero slot, otherwise a draft would empty it
    if (data.isFeatured && data.published) {
      await db
        .update(blogPosts)
        .set({ isFeatured: false })
        .where(and(ne(blogPosts.id, data.id), eq(blogPosts.isFeatured, true)))
    }

    // A new slug must not shadow another post's old address
    if (updates.slug) {
      await db
        .update(blogPosts)
        .set({ previousSlugs: sql`array_remove(${blogPosts.previousSlugs}, ${data.slug})` })
        .where(ne(blogPosts.id, data.id))
    }

    // Delete replaced/removed images (cover + inline), best-effort, never ones another post still uses
    const previous = currentPost.featuredImage
    const next = input.featuredImage === undefined ? previous : input.featuredImage
    const orphans = new Set<string>()
    if (previous && previous !== next) orphans.add(previous)
    if (input.body !== undefined) {
      const kept = new Set(bodyImageUrls(input.body))
      for (const url of bodyImageUrls(currentPost.body)) if (!kept.has(url) && url !== next) orphans.add(url)
    }
    if (orphans.size > 0) {
      try {
        await deleteUploadthingFilesByUrls(await unusedElsewhere([...orphans], id))
      } catch (err) {
        console.error('UploadThing cleanup failed (blog images):', err)
      }
    }

    revalidateBlog(currentPost.slug, data.slug)
    return NextResponse.json({ ok: true, post: data })
  } catch (err: unknown) {
    console.error('Failed to update blog post:', err)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'Another post already uses this web address. Change it under Search & sharing.' }, { status: 409 })
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
  if (!isUuid(id)) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  try {
    const [before] = await db
      .select({ featuredImage: blogPosts.featuredImage, slug: blogPosts.slug, body: blogPosts.body })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1)

    await db.delete(blogPosts).where(eq(blogPosts.id, id))

    const urls = [...(before?.featuredImage ? [before.featuredImage] : []), ...bodyImageUrls(before?.body)]
    if (urls.length > 0) {
      try {
        await deleteUploadthingFilesByUrls(await unusedElsewhere(urls, id))
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

/** Keep only URLs no other post references (as cover or inside its body). */
async function unusedElsewhere(urls: string[], exceptId: string): Promise<string[]> {
  const out: string[] = []
  for (const url of urls) {
    const [other] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(ne(blogPosts.id, exceptId), sql`(${blogPosts.featuredImage} = ${url} OR ${like(blogPosts.body, `%${url}%`)})`))
      .limit(1)
    if (!other) out.push(url)
  }
  return out
}
