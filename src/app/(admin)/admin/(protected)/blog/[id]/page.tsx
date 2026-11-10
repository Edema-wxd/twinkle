import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { eq } from 'drizzle-orm'
import { sanitizeArticleHtml, toBlogPostDto } from '@/lib/content'
import { isUuid } from '@/lib/content-api'
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
  if (!isUuid(id)) notFound()

  const [[row], { products, existingTags }] = await Promise.all([
    db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1),
    getBlogEditorData(),
  ])

  if (!row) {
    notFound()
  }

  return (
    <div className="px-6 lg:px-8">
      <BlogPostForm post={{ ...toBlogPostDto(row), body: sanitizeArticleHtml(row.body) }} products={products} existingTags={existingTags} />
    </div>
  )
}
