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
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
]

/** Hosts whose images Next can optimise (must match next.config images.remotePatterns). */
const OPTIMISABLE_IMAGE_HOSTS = ['ta1u3ge9om.ufs.sh']

function optimisedSrc(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`
}

/**
 * Sanitise Tiptap HTML for a blog article body.
 * `forDisplay` additionally routes uploaded images through Next's image optimiser
 * (resized, modern formats) instead of shipping multi-MB originals to phones.
 */
export function sanitizeArticleHtml(html: string | null | undefined, { forDisplay = false } = {}): string {
  if (!html) return ''
  const clean = sanitizeHtml(html, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        const isInternal = href.startsWith('/') || href.startsWith('#')
        const out: Record<string, string> = isInternal
          ? { href }
          : { href, target: '_blank', rel: 'noopener noreferrer' }
        return { tagName, attribs: out }
      },
      img: (tagName, attribs) => {
        const out: Record<string, string> = { src: attribs.src ?? '', alt: attribs.alt ?? '' }
        if (attribs.title) out.title = attribs.title
        if (forDisplay) {
          out.loading = 'lazy'
          out.decoding = 'async'
          let host = ''
          try { host = new URL(out.src).hostname } catch { /* relative or invalid */ }
          if (OPTIMISABLE_IMAGE_HOSTS.includes(host)) {
            const original = out.src
            out.src = optimisedSrc(original, 1080)
            out.srcset = [640, 828, 1080, 1920].map((w) => `${optimisedSrc(original, w)} ${w}w`).join(', ')
            out.sizes = '(max-width: 720px) 100vw, 680px'
          }
        }
        return { tagName, attribs: out }
      },
    },
  })
  // Wide tables scroll inside their own box on phones instead of stretching the page
  return forDisplay
    ? clean.replace(/<table>/g, '<div class="tl-table-scroll"><table>').replace(/<\/table>/g, '</table></div>')
    : clean
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
  return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos' })
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
