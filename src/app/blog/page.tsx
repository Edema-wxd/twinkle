import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { db, blogPosts as blogPostsTable } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { BlogCategoryFilter } from '@/components/blog/BlogCategoryFilter'
import { NewsletterBand } from '@/components/blog/NewsletterBand'
import { formatPostDate, toBlogCard, type BlogCardPost } from '@/lib/content'

export const metadata: Metadata = {
  title: { absolute: 'Loc Care Tips & Styling Guides | Twinkle Locs Blog' },
  description: 'Loc styling tips, bead care guides, and accessory inspiration from Twinkle Locs. Learn how to style your locs with beads, maintain them, and express yourself.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Loc Care Tips & Styling Guides | Twinkle Locs Blog',
    description: 'Loc styling tips, bead care guides, and accessory inspiration from Twinkle Locs. Learn how to style your locs with beads, maintain them, and express yourself.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

interface BlogPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category } = await searchParams

  let all: (BlogCardPost & { is_featured: boolean })[] = []
  try {
    const rows = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.published, true))
      .orderBy(desc(blogPostsTable.publishedAt))
    all = rows.map((r) => ({ ...toBlogCard(r), is_featured: r.isFeatured }))
  } catch (err) {
    console.error('[BlogPage] failed to load posts:', err)
  }

  const tags = [...new Set(all.map((p) => p.tag).filter((t): t is string => Boolean(t)))].sort()
  // Only honour real categories (case-insensitive), so a crafted ?category= can't rewrite the page heading
  const wanted = category?.trim().toLowerCase()
  const activeTag = wanted ? (tags.find((t) => t.toLowerCase() === wanted) ?? null) : null
  const filtered = activeTag ? all.filter((p) => p.tag?.toLowerCase() === activeTag.toLowerCase()) : all

  // Hero = pinned post, else the newest. Only on the unfiltered view.
  const hero = activeTag ? null : (all.find((p) => p.is_featured) ?? all[0] ?? null)
  const rest = filtered.filter((p) => p.id !== hero?.id)

  return (
    <div className="bg-cream">
      {/* Masthead */}
      <header className="relative overflow-hidden bg-forest">
        <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 md:pt-20 md:pb-24">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">The Twinkle Journal</p>
          <h1 className="mt-8 max-w-3xl font-display text-5xl leading-[1.2] text-cream md:mt-10 md:text-7xl">
            {activeTag ?? 'Stories, styling & loc care'}
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-cream/80 md:text-lg">
            {activeTag
              ? `Everything we've written about ${activeTag.toLowerCase()}.`
              : 'How to wear beads, keep them shining, and make your locs feel like jewellery. Written by Unoma and the Twinkle family.'}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        {/* Featured story */}
        {hero && (
          <article className="group relative -mt-10 grid overflow-hidden rounded-3xl bg-white shadow-xl shadow-forest/10 md:-mt-14 md:grid-cols-[1.25fr_1fr]">
            <div className="relative aspect-[4/3] bg-forest md:aspect-auto md:min-h-[26rem]">
              {hero.featured_image ? (
                <Image
                  src={hero.featured_image}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-25" />
              )}
            </div>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
                {hero.is_featured ? 'Editor’s pick' : 'Latest story'}
                {hero.tag && <> &middot; {hero.tag}</>}
              </p>
              <h2 className="mt-3 font-heading text-2xl font-bold leading-tight text-forest text-balance md:text-3xl">
                <Link
                  href={`/blog/${hero.slug}`}
                  className="decoration-gold decoration-2 underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:rounded-3xl"
                >
                  {hero.title}
                </Link>
              </h2>
              {hero.excerpt && <p className="mt-4 font-body leading-relaxed text-charcoal/75">{hero.excerpt}</p>}
              <p className="mt-6 font-body text-xs text-charcoal/65">
                {formatPostDate(hero.published_at)} &middot; {hero.reading_minutes} min read
              </p>
            </div>
          </article>
        )}

        {/* Category filter + grid */}
        <section aria-label="All stories" className={hero ? 'pt-14 pb-16' : 'pt-10 pb-16'}>
          <BlogCategoryFilter tags={tags} activeTag={activeTag} />

          {rest.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            !hero && (
              <div className="mt-10 rounded-3xl border border-dashed border-forest/20 px-6 py-16 text-center">
                <p className="font-display text-4xl text-forest">{activeTag ? 'Nothing here yet' : 'First stories coming soon'}</p>
                <p className="mx-auto mt-3 max-w-md font-body text-charcoal/70">
                  {activeTag
                    ? 'We haven’t written in this category yet.'
                    : 'Join the list below and we’ll send the first guide straight to you.'}
                </p>
                {activeTag && (
                  <Link href="/blog" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-forest px-6 font-heading text-sm font-semibold text-cream hover:bg-forest/90">
                    See all stories
                  </Link>
                )}
              </div>
            )
          )}
        </section>

        <div className="pb-20">
          <NewsletterBand />
        </div>
      </div>
    </div>
  )
}
