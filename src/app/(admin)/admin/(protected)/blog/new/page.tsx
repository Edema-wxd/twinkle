import { requireAdminSession } from '@/lib/auth/server'
import { BlogPostForm } from '../../../../_components/BlogPostForm'

export const metadata = {
  title: 'New Blog Post — Twinkle Locs Admin',
}

export default async function NewBlogPostPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">New Blog Post</h1>
        <p className="text-stone-400 text-sm mt-1">
          Write and publish a new blog post.
        </p>
      </div>

      <BlogPostForm />
    </div>
  )
}
