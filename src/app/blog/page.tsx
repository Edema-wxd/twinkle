import type { Metadata } from 'next'
import { Suspense } from 'react'
import { db, blogPosts as blogPostsTable } from '@/db'
import { eq, desc, isNotNull } from 'drizzle-orm'
import { Tables } from '@/types/supabase'
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

type BlogPostCardShape = Pick<
  Tables<'blog_posts'>,
  'id' | 'title' | 'slug' | 'excerpt' | 'featured_image' | 'tag' | 'published_at'
>

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category } = await searchParams

  // Fetch posts — filter by tag if category param present
  let postsQuery = db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      slug: blogPostsTable.slug,
      excerpt: blogPostsTable.excerpt,
      featuredImage: blogPostsTable.featuredImage,
      tag: blogPostsTable.tag,
      publishedAt: blogPostsTable.publishedAt,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(desc(blogPostsTable.publishedAt))
    .$dynamic()

  if (category) {
    const { and, eq: eqFn } = await import('drizzle-orm')
    postsQuery = postsQuery.where(and(eq(blogPostsTable.published, true), eqFn(blogPostsTable.tag, category)))
  }

  const [postsData, tagRows] = await Promise.all([
    postsQuery,
    db
      .select({ tag: blogPostsTable.tag })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.published, true)),
  ])

  const tags: string[] = [
    ...new Set(
      tagRows.map((r) => r.tag).filter((t): t is string => Boolean(t))
    ),
  ]

  // Map Drizzle camelCase to snake_case shape expected by BlogPostCard component
  const posts: BlogPostCardShape[] = postsData.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    featured_image: r.featuredImage,
    tag: r.tag,
    published_at: r.publishedAt ? r.publishedAt.toISOString() : null,
  }))

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
