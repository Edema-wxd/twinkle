'use client'

import { marked } from 'marked'

/**
 * Turn a Markdown document (e.g. exported from Notion, Google Docs, Obsidian or
 * written by hand) into HTML the blog editor understands, plus any metadata
 * found in YAML front matter.
 *
 * Images: the site's Content-Security-Policy only allows images from our own
 * UploadThing bucket, so every image is re-hosted there:
 *   - local files (`![](images/a.jpg)`) are matched by file name against files
 *     the writer selected alongside the .md file
 *   - remote URLs are copied server-side by /api/admin/blog/import-image
 */

export type MarkdownMeta = {
  title?: string
  excerpt?: string
  tag?: string
  slug?: string
  cover?: string
  seoTitle?: string
  seoDescription?: string
}

export type ImageResolvers = {
  /** Upload a local file that the .md referenced; return its hosted URL */
  uploadLocal?: (file: File) => Promise<string | null>
  /** Copy a remote image into our storage; return its hosted URL */
  rehostRemote?: (url: string) => Promise<string | null>
  /** Files picked/dropped with the .md (images referenced by relative path) */
  files?: File[]
}

export type MarkdownImportResult = {
  html: string
  meta: MarkdownMeta
  stats: { images: number; imagesFailed: number; tables: number; links: number; words: number }
  warnings: string[]
}

const HOSTED = /^https:\/\/[a-z0-9-]+\.ufs\.sh\//i

/** Heuristic used for paste: does this plain text look like Markdown? */
export function looksLikeMarkdown(text: string): boolean {
  if (text.length < 3) return false
  const signals = [
    /^#{1,6}\s+\S/m, // headings
    /^\s*[-*+]\s+\S/m, // bullets
    /^\s*\d+\.\s+\S/m, // numbered
    /\*\*[^*\n]+\*\*/, // bold
    /\[[^\]\n]+\]\([^)\s]+\)/, // links
    /!\[[^\]\n]*\]\([^)\s]+\)/, // images
    /^\s*\|.*\|\s*$/m, // table rows
    /^\s*>\s+\S/m, // quotes
    /^---\s*$/m, // rules / front matter
  ]
  return signals.filter((r) => r.test(text)).length >= 2 || /^\s*\|.*\|\s*\n\s*\|[\s:|-]+\|/m.test(text)
}

/** Minimal YAML front matter reader: `key: value`, quoted values, `[a, b]` and `- a` lists. */
function parseFrontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = md.match(/^﻿?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/)
  if (!m) return { meta: {}, body: md }
  const meta: Record<string, string> = {}
  let currentListKey: string | null = null
  for (const raw of m[1].split(/\r?\n/)) {
    const listItem = raw.match(/^\s*-\s+(.*)$/)
    if (listItem && currentListKey) {
      if (!meta[currentListKey]) meta[currentListKey] = unquote(listItem[1])
      continue
    }
    const kv = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    const key = kv[1].toLowerCase()
    let value = kv[2].trim()
    currentListKey = value === '' ? key : null
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1).split(',')[0] ?? ''
    if (value) meta[key] = unquote(value)
  }
  return { meta, body: md.slice(m[0].length) }
}

function unquote(v: string) {
  return v.trim().replace(/^["']|["']$/g, '').trim()
}

function basename(path: string) {
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep as-is */
  }
  return path.split(/[\\/]/).pop()!.split('?')[0].toLowerCase()
}

export async function markdownToArticle(md: string, resolvers: ImageResolvers = {}): Promise<MarkdownImportResult> {
  const warnings: string[] = []
  const { meta: fm, body } = parseFrontMatter(md.replace(/\r\n/g, '\n'))

  const rawHtml = await marked.parse(body, { gfm: true, breaks: false })
  const doc = new DOMParser().parseFromString(`<div id="root">${rawHtml}</div>`, 'text/html')
  const root = doc.getElementById('root')!

  const meta: MarkdownMeta = {
    title: fm.title,
    excerpt: fm.excerpt ?? fm.description ?? fm.summary ?? fm.subtitle,
    tag: fm.category ?? fm.tag ?? fm.tags ?? fm.categories,
    slug: fm.slug,
    cover: fm.cover ?? fm.image ?? fm.featured_image ?? fm.cover_image ?? fm.og_image,
    seoTitle: fm.seo_title ?? fm.meta_title,
    seoDescription: fm.seo_description ?? fm.meta_description,
  }

  // ── Headings: the post title is its own field, the editor has H2/H3 ─────────
  const h1s = Array.from(root.querySelectorAll('h1'))
  if (h1s.length > 0 && !meta.title) {
    meta.title = h1s[0].textContent?.trim() || undefined
    h1s[0].remove()
    h1s.shift()
  } else if (h1s.length > 0 && meta.title && h1s[0].textContent?.trim() === meta.title) {
    h1s[0].remove()
    h1s.shift()
  }
  for (const h of h1s) rename(h, 'h2')
  for (const h of Array.from(root.querySelectorAll('h4, h5, h6'))) rename(h, 'h3')

  // Teaser fallback: first paragraph, if short enough to read as an intro
  if (!meta.excerpt) {
    const first = root.querySelector(':scope > p')
    const t = first?.textContent?.trim() ?? ''
    if (t && t.length <= 220 && !first?.querySelector('img')) meta.excerpt = t
  }

  // ── Unsupported formatting → closest supported equivalent ─────────────────
  for (const pre of Array.from(root.querySelectorAll('pre'))) {
    const p = doc.createElement('p')
    const lines = (pre.textContent ?? '').replace(/\n$/, '').split('\n')
    lines.forEach((line, i) => {
      if (i > 0) p.appendChild(doc.createElement('br'))
      p.appendChild(doc.createTextNode(line))
    })
    pre.replaceWith(p)
  }
  for (const code of Array.from(root.querySelectorAll('code'))) code.replaceWith(...Array.from(code.childNodes))
  for (const del of Array.from(root.querySelectorAll('del'))) rename(del, 's')
  for (const input of Array.from(root.querySelectorAll('input'))) input.remove() // task-list checkboxes
  for (const cell of Array.from(root.querySelectorAll('th, td'))) cell.removeAttribute('align')

  // ── Links ──────────────────────────────────────────────────────────────────
  const links = Array.from(root.querySelectorAll('a'))
  for (const a of links) {
    const href = a.getAttribute('href') ?? ''
    // Absolute links to our own site become internal links
    const own = href.match(/^https?:\/\/(www\.)?twinklelocs\.com(\/.*)?$/i)
    if (own) a.setAttribute('href', own[2] || '/')
    else if (/\.(md|markdown)(#.*)?$/i.test(href) && !/^https?:/i.test(href)) {
      warnings.push(`Link to "${href}" points at another Markdown file. Update it to the post's web address.`)
    }
    a.removeAttribute('title')
  }

  // ── Images ─────────────────────────────────────────────────────────────────
  const fileByName = new Map((resolvers.files ?? []).map((f) => [f.name.toLowerCase(), f]))
  const uploadedLocal = new Map<string, string | null>()
  const rehosted = new Map<string, string | null>()

  async function resolveImage(src: string): Promise<string | null> {
    if (!src) return null
    if (HOSTED.test(src)) return src
    if (/^https?:\/\//i.test(src)) {
      if (!rehosted.has(src)) rehosted.set(src, resolvers.rehostRemote ? await resolvers.rehostRemote(src) : null)
      return rehosted.get(src) ?? null
    }
    if (src.startsWith('data:')) return null
    const name = basename(src)
    const file = fileByName.get(name)
    if (!file) return null
    if (!uploadedLocal.has(name)) uploadedLocal.set(name, resolvers.uploadLocal ? await resolvers.uploadLocal(file) : null)
    return uploadedLocal.get(name) ?? null
  }

  const imgs = Array.from(root.querySelectorAll('img'))
  let imagesFailed = 0
  // Upload a few at a time so a post with 20 photos doesn't flood the connection
  for (let i = 0; i < imgs.length; i += 3) {
    await Promise.all(
      imgs.slice(i, i + 3).map(async (img) => {
        const src = img.getAttribute('src') ?? ''
        const hosted = await resolveImage(src)
        if (hosted) {
          img.setAttribute('src', hosted)
          img.removeAttribute('title')
        } else {
          imagesFailed++
          const label = img.getAttribute('alt') || basename(src) || 'image'
          warnings.push(
            /^https?:/i.test(src)
              ? `Couldn't copy the image "${label}" from ${hostOf(src)}. Download it and insert it with the image button.`
              : `Image "${basename(src)}" wasn't in the files you selected. Add it with the image button.`,
          )
          img.remove()
        }
      }),
    )
  }
  // Images Markdown put inside paragraphs: Tiptap lifts them out, drop empty <p>s left behind
  for (const p of Array.from(root.querySelectorAll('p'))) {
    if (!p.textContent?.trim() && !p.querySelector('img, br')) p.remove()
  }

  if (meta.cover) {
    const hosted = await resolveImage(meta.cover)
    if (hosted) meta.cover = hosted
    else {
      warnings.push(`Cover image "${basename(meta.cover)}" couldn't be added. Upload it under Cover image.`)
      meta.cover = undefined
    }
  }

  const text = (root.textContent ?? '').replace(/\s+/g, ' ').trim()
  return {
    html: root.innerHTML.trim(),
    meta,
    stats: {
      images: imgs.length - imagesFailed,
      imagesFailed,
      tables: root.querySelectorAll('table').length,
      links: root.querySelectorAll('a').length,
      words: text ? text.split(' ').length : 0,
    },
    warnings,
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return 'that address'
  }
}

function rename(el: Element, tag: string) {
  const next = el.ownerDocument.createElement(tag)
  while (el.firstChild) next.appendChild(el.firstChild)
  el.replaceWith(next)
  return next
}

/** Client helper: ask the server to copy a remote image into our storage. */
export async function rehostViaApi(url: string): Promise<string | null> {
  try {
    const res = await fetch('/api/admin/blog/import-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { url?: string }
    return data.url ?? null
  } catch {
    return null
  }
}

/** True when pasted HTML is just styled lines (VS Code, terminals), not a real document. */
export function isPresentationalHtml(html: string): boolean {
  return !/<(p|h[1-6]|ul|ol|li|table|blockquote|a|img|strong|em|b|i)\b/i.test(html)
}

/** Re-host any foreign images inside pasted HTML (Google Docs, websites). */
export async function rehostImagesInHtml(html: string): Promise<{ html: string; failed: number }> {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = doc.getElementById('root')!
  let failed = 0
  for (const img of Array.from(root.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? ''
    if (HOSTED.test(src)) continue
    const hosted = /^https?:\/\//i.test(src) ? await rehostViaApi(src) : null
    if (hosted) img.setAttribute('src', hosted)
    else {
      failed++
      img.remove()
    }
  }
  return { html: root.innerHTML, failed }
}

export function hasForeignImages(html: string): boolean {
  const srcs = Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)).map((m) => m[1])
  return srcs.some((s) => !HOSTED.test(s))
}
