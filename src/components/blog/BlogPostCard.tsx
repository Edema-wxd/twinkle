import Image from 'next/image'
import Link from 'next/link'
import { Tables } from '@/types/supabase'

type BlogPostCardProps = {
  post: Pick<
    Tables<'blog_posts'>,
    'id' | 'title' | 'slug' | 'excerpt' | 'featured_image' | 'tag' | 'published_at'
  >
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-300 transition-colors bg-white"
    >
      {/* Featured image */}
      <div className="relative w-full aspect-[4/3] bg-stone-100">
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-100">
            <div className="w-12 h-12 rounded-full bg-[var(--color-gold,#C9A84C)] opacity-20" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5 gap-2">
        {/* Tag */}
        {post.tag && (
          <span className="inline-block self-start text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--color-gold,#C9A84C)] text-white">
            {post.tag}
          </span>
        )}

        {/* Title */}
        <h2 className="font-heading text-lg font-bold text-charcoal group-hover:underline underline-offset-2 leading-snug">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="text-sm text-charcoal/70 line-clamp-3 leading-relaxed flex-1">
          {post.excerpt}
        </p>

        {/* Date */}
        {formattedDate && (
          <p className="text-xs text-charcoal/50 mt-auto pt-2">{formattedDate}</p>
        )}
      </div>
    </Link>
  )
}
