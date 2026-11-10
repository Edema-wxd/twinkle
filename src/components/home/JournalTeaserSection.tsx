import Link from 'next/link'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import type { BlogCardPost } from '@/lib/content'

export function JournalTeaserSection({ posts }: { posts: BlogCardPost[] }) {
  if (posts.length === 0) return null

  return (
    <section aria-labelledby="journal-teaser" className="bg-cream px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">From the journal</p>
            <h2 id="journal-teaser" className="mt-6 font-display text-4xl leading-[1.2] text-forest md:text-5xl">Styling notes & loc care</h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center rounded-full px-5 font-heading text-sm font-semibold text-forest ring-1 ring-forest/25 transition-colors hover:bg-forest hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            All stories
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogPostCard key={p.id} post={p} headingLevel="h3" />
          ))}
        </div>
      </div>
    </section>
  )
}
