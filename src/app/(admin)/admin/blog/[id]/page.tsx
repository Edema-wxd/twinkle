import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BlogPostForm } from '../../../_components/BlogPostForm'

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

  const adminClient = createAdminClient()
  const result = await adminClient
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (result.error || !result.data) {
    notFound()
  }

  const post = result.data

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
