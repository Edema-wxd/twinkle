import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { eq } from 'drizzle-orm'
import { toBlogPostDto } from '@/lib/content'
import { BlogPostForm } from '../../../../_components/BlogPostForm'
import { getBlogEditorData } from '../../../../_lib/blog-editor-data'

export const metadata = {
  title: 'Edit Blog Post — Twinkle Locs Admin',
}

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  const { id } = await params

  const [[row], { products, existingTags }] = await Promise.all([
    db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1),
    getBlogEditorData(),
  ])

  if (!row) {
    notFound()
  }

  return (
    <div className="px-6 lg:px-8">
      {/* key forces a fresh form (and clean dirty state) after a save refresh */}
      <BlogPostForm key={row.updatedAt.toISOString()} post={toBlogPostDto(row)} products={products} existingTags={existingTags} />
    </div>
  )
}
