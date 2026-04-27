import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { eq } from 'drizzle-orm'
import { BlogPostForm } from '../../../../_components/BlogPostForm'

export const metadata = {
  title: 'Edit Blog Post — Twinkle Locs Admin',
}

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { id } = await params

  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1)

  if (!row) {
    notFound()
  }

  // Map camelCase Drizzle row to snake_case shape expected by BlogPostForm (BlogPost from @/types/supabase)
  const post = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    excerpt: row.excerpt,
    featured_image: row.featuredImage ?? null,
    tag: row.tag ?? null,
    published: row.published,
    published_at: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : (row.publishedAt ?? null),
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Edit Blog Post</h1>
        <p className="text-stone-400 text-sm mt-1">Update the post details below.</p>
      </div>

      <BlogPostForm post={post} />
    </div>
  )
}
