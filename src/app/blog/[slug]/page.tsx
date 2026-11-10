import type { Metadata } from 'next'
import { cache } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db, blogPosts as blogPostsTable, products as productsTable } from '@/db'
import { and, desc, eq, inArray, ne } from 'drizzle-orm'
import { BlogShareButtons } from '@/components/blog/BlogShareButtons'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { NewsletterBand } from '@/components/blog/NewsletterBand'
import { ShopTheLook, type LookProduct } from '@/components/blog/ShopTheLook'
import { BUSINESS } from '@/lib/config/business'
import {
  formatPostDate,
  htmlToText,
  readingTime,
  sanitizeArticleHtml,
  toBlogCard,
  wordCount,
  type BlogCardPost,
} from '@/lib/content'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

// Shared between generateMetadata and the page so the DB is hit once per request
const getPost = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.published, true)))
    .limit(1)
  return row ?? null
})

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const row = await getPost(slug)
  if (!row) return {}

  const title = row.seoTitle || row.title
  const description = row.seoDescription || row.excerpt || htmlToText(row.body).slice(0, 160)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: row.featuredImage ? [{ url: row.featuredImage }] : [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'article',
      publishedTime: row.publishedAt ? row.publishedAt.toISOString() : undefined,
      modifiedTime: row.updatedAt.toISOString(),
      tags: row.tag ? [row.tag] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/blog/${row.slug}` },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return notFound()

  const productIds = post.featuredProductIds ?? []

  const [productRows, sameTagRows, latestRows] = await Promise.all([
    productIds.length
      ? db
          .select({
            id: productsTable.id,
            name: productsTable.name,
            slug: productsTable.slug,
            image: productsTable.image,
            priceMin: productsTable.priceMin,
            material: productsTable.material,
          })
          .from(productsTable)
          .where(and(inArray(productsTable.id, productIds), eq(productsTable.isActive, true)))
      : Promise.resolve([]),
    post.tag
      ? db
          .select()
          .from(blogPostsTable)
          .where(and(eq(blogPostsTable.published, true), eq(blogPostsTable.tag, post.tag), ne(blogPostsTable.id, post.id)))
          .orderBy(desc(blogPostsTable.publishedAt))
          .limit(3)
      : Promise.resolve([]),
    db
      .select()
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.published, true), ne(blogPostsTable.id, post.id)))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(3),
  ])

  // Keep the admin's chosen order
  const lookProducts: LookProduct[] = productIds
    .map((id) => productRows.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, image: p.image, price_min: p.priceMin, material: p.material }))

  // Related: same category first, topped up with the latest stories
  const relatedMap = new Map<string, BlogCardPost>()
  for (const r of [...sameTagRows, ...latestRows]) {
    if (relatedMap.size >= 3) break
    if (!relatedMap.has(r.id)) relatedMap.set(r.id, toBlogCard(r))
  }
  const related = [...relatedMap.values()]

  const html = sanitizeArticleHtml(post.body)
  const minutes = readingTime(post.body)
  const date = formatPostDate(post.publishedAt?.toISOString())
  const canonicalUrl = `${BASE}/blog/${post.slug}`

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.featuredImage ?? undefined,
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    dateModified: post.updatedAt.toISOString(),
    wordCount: wordCount(post.body),
    articleSection: post.tag ?? undefined,
    author: { '@type': 'Organization', name: 'Twinkle Locs', url: BASE },
    publisher: { '@type': 'Organization', name: 'Twinkle Locs', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/images/Logo.png` } },
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  }

  return (
    <article className="bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      {/* Header */}
      <header className={`relative overflow-hidden bg-forest ${post.featuredImage ? 'pb-28 md:pb-40' : 'pb-16'}`}>
        <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-10 text-center md:pt-14">
          <nav aria-label="Breadcrumb" className="font-body text-xs text-cream/70">
            <Link href="/blog" className="hover:text-cream underline-offset-4 hover:underline">Journal</Link>
            {post.tag && (
              <>
                <span aria-hidden="true" className="mx-2">/</span>
                <Link href={`/blog?category=${encodeURIComponent(post.tag)}`} className="hover:text-cream underline-offset-4 hover:underline">
                  {post.tag}
                </Link>
              </>
            )}
          </nav>
          <h1 className="mt-6 font-heading text-3xl font-bold leading-[1.15] text-cream text-balance md:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-cream/80 md:text-lg">{post.excerpt}</p>}
          <p className="mt-6 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
            {date && <time dateTime={post.publishedAt?.toISOString()}>{date}</time>}
            {date && <span aria-hidden="true"> &middot; </span>}
            {minutes} min read
          </p>
        </div>
      </header>

      {post.featuredImage && (
        <div className="relative z-10 mx-auto -mt-20 max-w-5xl px-4 md:-mt-32">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl shadow-2xl shadow-forest/20">
            <Image src={post.featuredImage} alt="" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="mx-auto max-w-2xl px-4 py-14 md:py-20">
        <div className="tl-prose tl-prose--article" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mt-14 flex flex-col gap-6 border-t border-forest/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <BlogShareButtons title={post.title} canonicalUrl={canonicalUrl} />
        </div>

        {/* Soft conversion: questions go to WhatsApp, where Unoma closes most sales */}
        <aside className="mt-10 flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-forest/10 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-heading font-semibold text-forest">Not sure which beads suit your locs?</p>
            <p className="mt-1 font-body text-sm text-charcoal/75">Send us a photo on WhatsApp and we&apos;ll recommend a size and finish.</p>
          </div>
          <a
            href={BUSINESS.whatsapp.url(`Hi! I just read "${post.title}" and I'd love a recommendation.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-forest px-6 font-heading text-sm font-semibold text-cream transition-colors hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            Ask on WhatsApp
          </a>
        </aside>
      </div>

      <div className="mx-auto max-w-6xl space-y-16 px-4 pb-20">
        <ShopTheLook products={lookProducts} />

        {related.length > 0 && (
          <section aria-labelledby="keep-reading">
            <h2 id="keep-reading" className="mb-8 font-display text-4xl text-forest">Keep reading</h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogPostCard key={p.id} post={p} headingLevel="h3" />
              ))}
            </div>
          </section>
        )}

        <NewsletterBand />
      </div>
    </article>
  )
}
