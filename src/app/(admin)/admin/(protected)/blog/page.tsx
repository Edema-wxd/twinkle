import Link from 'next/link'
import Image from 'next/image'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { desc } from 'drizzle-orm'
import { readingTime } from '@/lib/content'

export const metadata = {
  title: 'Blog Posts — Twinkle Locs Admin',
}

type Row = {
  id: string
  title: string
  slug: string
  tag: string | null
  featuredImage: string | null
  isFeatured: boolean
  published: boolean
  publishedAt: Date | null
  updatedAt: Date
  minutes: number
  productCount: number
}

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
}

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()
  const { status } = await searchParams

  let posts: Row[] = []
  let loadError = false
  try {
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt))
    posts = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      tag: r.tag,
      featuredImage: r.featuredImage,
      isFeatured: r.isFeatured,
      published: r.published,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      minutes: readingTime(r.body),
      productCount: r.featuredProductIds?.length ?? 0,
    }))
  } catch (error) {
    loadError = true
    console.error('Failed to fetch blog posts for admin:', error)
  }

  const live = posts.filter((p) => p.published)
  const drafts = posts.filter((p) => !p.published)
  const featured = posts.find((p) => p.isFeatured && p.published)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = live.filter((p) => p.publishedAt && p.publishedAt.getTime() >= thirtyDaysAgo).length
  const visible = status === 'draft' ? drafts : status === 'live' ? live : posts

  const tabs = [
    { key: undefined, label: 'All', count: posts.length },
    { key: 'live', label: 'Live', count: live.length },
    { key: 'draft', label: 'Drafts', count: drafts.length },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Blog</h1>
          <p className="text-stone-400 text-sm mt-1">
            Guides and stories bring people to the shop from Google, WhatsApp and Instagram.
          </p>
        </div>
        <Link href="/admin/blog/new" className="px-4 py-2.5 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
          + Write a post
        </Link>
      </div>

      {loadError && (
        <p role="alert" className="rounded-lg bg-red-950/60 ring-1 ring-red-800 px-4 py-3 text-sm text-red-200">
          Couldn&apos;t load posts. If you just deployed, run <code className="font-mono">npx drizzle-kit push</code> to add the new blog columns.
        </p>
      )}

      {/* Stats */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Live posts" value={live.length} />
        <Stat label="Drafts" value={drafts.length} />
        <Stat label="Published last 30 days" value={recent} hint={recent === 0 ? 'Aim for one post a fortnight' : undefined} />
        <div className="rounded-xl bg-stone-900 ring-1 ring-stone-800 p-4">
          <dt className="text-xs text-stone-400">Featured on /blog</dt>
          <dd className="mt-1 text-sm text-white font-medium line-clamp-2">
            {featured ? (
              <Link href={`/admin/blog/${featured.id}`} className="hover:text-gold-light">{featured.title}</Link>
            ) : (
              <span className="text-stone-500">Newest post (none pinned)</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Filter tabs */}
      <nav aria-label="Filter posts" className="flex gap-1 border-b border-stone-800">
        {tabs.map((t) => {
          const active = status === t.key || (!status && !t.key)
          return (
            <Link
              key={t.label}
              href={t.key ? `/admin/blog?status=${t.key}` : '/admin/blog'}
              aria-current={active ? 'page' : undefined}
              className={`px-3 py-2 -mb-px text-sm border-b-2 transition-colors ${active ? 'border-gold text-white' : 'border-transparent text-stone-400 hover:text-white'}`}
            >
              {t.label} <span className="text-stone-500 tabular-nums">{t.count}</span>
            </Link>
          )
        })}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-700 px-6 py-14 text-center">
          <p className="text-white font-medium">{posts.length === 0 ? 'Your journal is empty' : 'Nothing here'}</p>
          <p className="text-stone-400 text-sm mt-1 max-w-md mx-auto">
            Ideas that sell: &ldquo;How to put beads in your locs&rdquo;, &ldquo;Gold vs silver: which suits you&rdquo;,
            &ldquo;Customer of the month&rdquo;, &ldquo;What 4mm vs 6mm actually looks like&rdquo;.
          </p>
          <Link href="/admin/blog/new" className="mt-5 inline-block px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-medium rounded-lg transition-colors">
            Write your first post
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone-800 rounded-xl ring-1 ring-stone-800 overflow-hidden">
          {visible.map((post) => (
            <li key={post.id} className="relative flex items-center gap-4 p-3 sm:p-4 bg-stone-900/40 hover:bg-stone-800/50 transition-colors">
              <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] rounded-lg overflow-hidden bg-stone-800 shrink-0">
                {post.featuredImage ? (
                  <Image src={post.featuredImage} alt="" fill className="object-cover" sizes="112px" unoptimized />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-stone-500">No cover</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${post.published ? 'bg-emerald-900/60 text-emerald-300' : 'bg-stone-700 text-stone-300'}`}>
                    {post.published ? 'Live' : 'Draft'}
                  </span>
                  {post.isFeatured && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gold/25 text-gold-light">★ Featured</span>}
                  {post.tag && <span className="text-xs text-stone-400">{post.tag}</span>}
                </div>
                <Link href={`/admin/blog/${post.id}`} className="block text-white font-medium truncate after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:rounded-none">
                  {post.title}
                </Link>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {post.published ? `Published ${fmt(post.publishedAt)}` : `Edited ${fmt(post.updatedAt)}`} &middot; {post.minutes} min read
                  {post.productCount > 0 && <> &middot; {post.productCount} product{post.productCount === 1 ? '' : 's'} linked</>}
                </p>
              </div>
              {post.published && (
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 hidden sm:inline-flex px-3 py-1.5 text-xs text-stone-300 hover:text-white rounded-md ring-1 ring-stone-700 hover:ring-stone-500 transition-colors"
                >
                  View &#8599;
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl bg-stone-900 ring-1 ring-stone-800 p-4">
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="mt-1 text-2xl font-heading font-bold text-white tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-amber-300/80 mt-0.5">{hint}</dd>}
    </div>
  )
}
