import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const adminClient = createAdminClient()

  // Fetch current post to detect published transition
  const { data: currentPost, error: fetchError } = await adminClient
    .from('blog_posts')
    .select('id, published, published_at')
    .eq('id', id)
    .single()

  if (fetchError || !currentPost) {
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
    updates.featured_image = featured_image || null
  }
  if (tag === null || typeof tag === 'string') {
    updates.tag = typeof tag === 'string' && tag.trim() ? tag.trim() : null
  }
  if (typeof published === 'boolean') {
    updates.published = published

    // Auto-set published_at when transitioning from unpublished to published
    if (published && !currentPost.published) {
      updates.published_at =
        typeof published_at === 'string' && published_at
          ? published_at
          : new Date().toISOString()
    }
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await adminClient
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update blog post:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, post: data })
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
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('blog_posts').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete blog post:', error)
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
