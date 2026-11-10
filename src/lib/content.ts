import sanitizeHtml from 'sanitize-html'
import { productDescriptionHtml } from '@/lib/product-description'
import type { blogPosts, faqs } from '@/db/schema'
import type { BlogPost, Faq } from '@/types/db'

/**
 * Shared helpers for editorial content (blog posts + FAQs).
 * Everything rendered with dangerouslySetInnerHTML goes through one of the
 * sanitisers below, even though it is admin-authored.
 */

const ARTICLE_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 's', 'u',
  'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'blockquote', 'hr',
  'a', 'img', 'figure', 'figcaption',
]

/** Sanitise Tiptap HTML for a blog article body. */
export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeHtml(html, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        const isInternal = href.startsWith('/') || href.startsWith('#')
        const out: Record<string, string> = isInternal
          ? { href }
          : { href, target: '_blank', rel: 'noopener noreferrer' }
        return { tagName, attribs: out }
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: 'lazy', alt: attribs.alt ?? '' },
      }),
    },
  })
}

/** Render an FAQ answer (legacy plain text or Tiptap HTML) as safe HTML. */
export function faqAnswerHtml(answer: string | null | undefined): string {
  return productDescriptionHtml(answer)
}

/** Strip all markup and collapse whitespace. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  const spaced = html.replace(/<\/(p|li|h[1-6]|blockquote|figcaption)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ')
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(html: string | null | undefined): number {
  const text = htmlToText(html)
  return text ? text.split(' ').length : 0
}

/** Minutes to read at ~220 wpm, never less than 1. */
export function readingTime(html: string | null | undefined): number {
  return Math.max(1, Math.round(wordCount(html) / 220))
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatPostDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Drizzle row → DTO mappers ────────────────────────────────────────────────

type BlogRow = typeof blogPosts.$inferSelect
type FaqRow = typeof faqs.$inferSelect

export function toBlogPostDto(row: BlogRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    excerpt: row.excerpt,
    featured_image: row.featuredImage ?? null,
    tag: row.tag ?? null,
    seo_title: row.seoTitle ?? null,
    seo_description: row.seoDescription ?? null,
    is_featured: row.isFeatured ?? false,
    featured_product_ids: row.featuredProductIds ?? [],
    published: row.published,
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function toFaqDto(row: FaqRow): Faq {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    display_order: row.displayOrder,
    is_featured: row.isFeatured ?? false,
    created_at: row.createdAt.toISOString(),
  }
}

/** Card-sized projection used by listing pages. */
export type BlogCardPost = Pick<
  BlogPost,
  'id' | 'title' | 'slug' | 'excerpt' | 'featured_image' | 'tag' | 'published_at'
> & { reading_minutes: number }

export function toBlogCard(row: BlogRow): BlogCardPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featured_image: row.featuredImage ?? null,
    tag: row.tag ?? null,
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
    reading_minutes: readingTime(row.body),
  }
}
