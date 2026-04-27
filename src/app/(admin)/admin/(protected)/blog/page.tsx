import Link from 'next/link'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { blogPosts } from '@/db'
import { desc } from 'drizzle-orm'

export const metadata = {
  title: 'Blog Posts — Twinkle Locs Admin',
}

export default async function AdminBlogPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  let posts: {
    id: string
    title: string
    slug: string
    tag: string | null
    published: boolean
    published_at: string | null
    created_at: string
  }[] = []

  try {
    const rows = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        tag: blogPosts.tag,
        published: blogPosts.published,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))

    posts = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      tag: r.tag ?? null,
      published: r.published,
      published_at: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : (r.publishedAt ?? null),
      created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))
  } catch (error) {
    console.error('Failed to fetch blog posts for admin:', error)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Blog Posts</h1>
          <p className="text-stone-400 text-sm mt-1">Create and manage blog content.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-gold hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-stone-700 bg-stone-800/50 px-6 py-12 text-center">
          <p className="text-stone-400 text-sm">No blog posts yet.</p>
          <Link
            href="/admin/blog/new"
            className="mt-4 inline-block px-4 py-2 bg-gold hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 bg-stone-800/70">
                <th className="px-4 py-3 text-left text-stone-400 font-medium">Title</th>
                <th className="px-4 py-3 text-left text-stone-400 font-medium hidden md:table-cell">Tag</th>
                <th className="px-4 py-3 text-left text-stone-400 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-stone-400 font-medium hidden sm:table-cell">Published</th>
                <th className="px-4 py-3 text-right text-stone-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700/60">
              {posts.map((post) => (
                <tr key={post.id} className="bg-stone-900/30 hover:bg-stone-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium line-clamp-1">{post.title}</span>
                    <span className="block text-xs text-stone-500 mt-0.5">/blog/{post.slug}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {post.tag ? (
                      <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 text-xs">
                        {post.tag}
                      </span>
                    ) : (
                      <span className="text-stone-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {post.published ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 text-xs font-medium">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-700 text-stone-400 text-xs font-medium">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs hidden sm:table-cell">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="text-gold hover:text-gold text-xs font-medium transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
