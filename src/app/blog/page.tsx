import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { BlogCategoryFilter } from '@/components/blog/BlogCategoryFilter'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tips, guides, and inspiration for your loc journey from the Twinkle Locs team — styling ideas, bead care, and loc maintenance advice.',
  openGraph: {
    title: 'Blog | Twinkle Locs',
    description: 'Loc styling tips, bead care guides, and inspiration from Twinkle Locs.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

interface BlogPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category } = await searchParams

  const supabase = await createClient()

  // Fetch posts — filter by tag if category param present
  const postsQuery = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, tag, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (category) {
    postsQuery.eq('tag', category)
  }

  const { data: postsData } = await postsQuery

  // Fetch all distinct tags from published posts
  const { data: tagRows } = await supabase
    .from('blog_posts')
    .select('tag')
    .eq('published', true)

  const tags: string[] = [
    ...new Set(
      (tagRows ?? []).map((r) => r.tag).filter((t): t is string => Boolean(t))
    ),
  ]

  const posts = postsData ?? []

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-heading text-4xl font-bold text-charcoal mb-2">Blog</h1>
      <p className="text-charcoal/60 mb-8">Loc care tips, brand stories, and community.</p>

      <Suspense>
        <BlogCategoryFilter tags={tags} activeTag={category ?? null} />
      </Suspense>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-center text-charcoal/50 py-16">No posts yet.</p>
      )}
    </main>
  )
}
