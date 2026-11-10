import Image from 'next/image'
import Link from 'next/link'
import { formatPostDate, type BlogCardPost } from '@/lib/content'

type BlogPostCardProps = {
  post: BlogCardPost
  /** Use a heading level that fits the surrounding page outline */
  headingLevel?: 'h2' | 'h3'
}

export function BlogPostCard({ post, headingLevel = 'h2' }: BlogPostCardProps) {
  const date = formatPostDate(post.published_at)
  const Heading = headingLevel

  return (
    <article className="group relative flex flex-col">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-forest">
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-25" />
        )}
        {post.tag && (
          <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-forest">
            {post.tag}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <p className="font-body text-xs text-charcoal/65">
          {date && <time dateTime={post.published_at ?? undefined}>{date}</time>}
          {date && ' · '}
          {post.reading_minutes} min read
        </p>
        <Heading className="mt-2 font-heading text-xl font-bold leading-snug text-forest text-balance">
          <Link
            href={`/blog/${post.slug}`}
            className="decoration-gold decoration-2 underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-cream"
          >
            {post.title}
          </Link>
        </Heading>
        {post.excerpt && (
          <p className="mt-2 font-body text-sm leading-relaxed text-charcoal/75 line-clamp-3">{post.excerpt}</p>
        )}
        <span aria-hidden="true" className="mt-4 font-heading text-sm font-semibold text-gold-deep">
          Read the story <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
        </span>
      </div>
    </article>
  )
}
