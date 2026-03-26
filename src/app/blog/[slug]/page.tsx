import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlogShareButtons } from '@/components/blog/BlogShareButtons'
import { BlogPostCard } from '@/components/blog/BlogPostCard'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params

  const supabase = await createClient()

  // Fetch the post — must be published; draft posts are 404
  const result = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (result.error || !result.data) return notFound()

  const post = result.data

  // Fetch related posts from same tag (skip if no tag)
  const relatedPosts =
    post.tag
      ? await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image, tag, published_at')
          .eq('published', true)
          .eq('tag', post.tag)
          .neq('id', post.id)
          .order('published_at', { ascending: false })
          .limit(3)
          .then(({ data }) => data ?? [])
      : []

  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'}/blog/${post.slug}`

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-charcoal/60 hover:text-charcoal transition-colors mb-6"
      >
        &larr; Back to Blog
      </Link>

      {/* Post header */}
      <h1 className="font-heading text-4xl font-bold text-charcoal mt-6 mb-3 leading-tight">
        {post.title}
      </h1>

      <div className="flex items-center gap-3 mb-4">
        {post.tag && (
          <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--color-gold,#C9A84C)] text-white">
            {post.tag}
          </span>
        )}
        {formattedDate && (
          <p className="text-charcoal/50 text-sm">{formattedDate}</p>
        )}
      </div>

      {/* Featured image */}
      {post.featured_image && (
        <div className="relative w-full aspect-video mb-8 rounded-xl overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Body — Tiptap HTML rendered with [&_tag]: selectors; no prose class */}
      <div
        className="[&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:mt-8 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-charcoal/80 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_a]:text-[var(--color-gold,#C9A84C)] [&_a]:underline [&_a]:hover:opacity-80 [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-stone-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-charcoal/60 [&_blockquote]:mb-4"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      {/* Share buttons */}
      <div className="mt-12 pt-8 border-t border-stone-200">
        <BlogShareButtons title={post.title} canonicalUrl={canonicalUrl} />
      </div>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-charcoal mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedPosts.map((p) => (
              <BlogPostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
