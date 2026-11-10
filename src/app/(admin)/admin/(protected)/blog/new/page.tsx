import { requireAdminSession } from '@/lib/auth/server'
import { BlogPostForm } from '../../../../_components/BlogPostForm'
import { getBlogEditorData } from '../../../../_lib/blog-editor-data'

export const metadata = {
  title: 'New Blog Post — Twinkle Locs Admin',
}

export default async function NewBlogPostPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()
  const { products, existingTags } = await getBlogEditorData()

  return (
    <div className="px-6 lg:px-8">
      <BlogPostForm products={products} existingTags={existingTags} />
    </div>
  )
}
