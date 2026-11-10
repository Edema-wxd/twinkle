import { UTApi } from 'uploadthing/server'
import { db, blogPosts, products, aboutSections } from '@/db'
import { fileKeyFromUploadthingUrl } from '@/lib/uploadthing/server'

/**
 * Every photo already uploaded, so a cover image can be reused instead of
 * uploaded again. Two sources, merged by UploadThing file key:
 *  - UploadThing itself (every file ever uploaded, even ones no longer used)
 *  - images the site already references (covers, products, About pages,
 *    photos inside posts), which also tells us where each one is used and
 *    catches older images hosted elsewhere
 */

export type MediaUsage = { kind: 'cover' | 'post' | 'product' | 'page'; label: string; href: string }

export type MediaItem = {
  url: string
  name: string
  /** ms since epoch, when UploadThing knows it */
  uploadedAt: number | null
  size: number | null
  usedIn: MediaUsage[]
}

export type MediaLibrary = { items: MediaItem[]; warning: string | null }

// Browsers can show these. HEIC/TIFF uploads exist but can't be previewed or used on the site.
const WEB_IMAGE = /\.(jpe?g|png|webp|gif|avif|svg)$/i
const MAX_UPLOADTHING_FILES = 3000
const PAGE = 500

function appIdFromToken(): string | null {
  const token = process.env.UPLOADTHING_TOKEN?.trim()
  if (!token) return null
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as { appId?: unknown }
    return typeof parsed.appId === 'string' && parsed.appId ? parsed.appId : null
  } catch {
    return null
  }
}

function appIdFromUrls(urls: string[]): string | null {
  for (const u of urls) {
    const m = u.match(/^https:\/\/([a-z0-9]+)\.ufs\.sh\/f\//i)
    if (m) return m[1]
  }
  return null
}

function imgSrcs(html: string): string[] {
  const out: string[] = []
  const re = /<img\b[^>]*?\ssrc=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) out.push(m[1])
  return out
}

function nameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? url
    return decodeURIComponent(last)
  } catch {
    return url
  }
}

/** Identity used to merge the two sources: the UploadThing key when there is one, else the URL. */
function idFor(url: string): string {
  return fileKeyFromUploadthingUrl(url) ?? url
}

async function usedImages(): Promise<{ url: string; usage: MediaUsage }[]> {
  const [posts, prods, pages] = await Promise.all([
    db.select({ id: blogPosts.id, title: blogPosts.title, featuredImage: blogPosts.featuredImage, body: blogPosts.body }).from(blogPosts),
    db.select({ id: products.id, name: products.name, image: products.image, images: products.images }).from(products),
    db.select({ id: aboutSections.id, title: aboutSections.title, imageUrl: aboutSections.imageUrl }).from(aboutSections),
  ])

  const out: { url: string; usage: MediaUsage }[] = []
  for (const p of posts) {
    const href = `/admin/blog/${p.id}`
    if (p.featuredImage) out.push({ url: p.featuredImage, usage: { kind: 'cover', label: p.title, href } })
    for (const src of new Set(imgSrcs(p.body ?? ''))) out.push({ url: src, usage: { kind: 'post', label: p.title, href } })
  }
  for (const p of prods) {
    for (const url of new Set([p.image, ...(p.images ?? [])])) {
      out.push({ url, usage: { kind: 'product', label: p.name, href: `/admin/products/${p.id}` } })
    }
  }
  for (const s of pages) {
    if (s.imageUrl) out.push({ url: s.imageUrl, usage: { kind: 'page', label: s.title, href: '/admin/pages' } })
  }
  // Only real web URLs (skip data: URIs and relative paths a pasted post might contain)
  return out.filter((x) => /^https:\/\//i.test(x.url.trim())).map((x) => ({ ...x, url: x.url.trim() }))
}

export async function listMediaLibrary(): Promise<MediaLibrary> {
  const byId = new Map<string, MediaItem>()
  let warning: string | null = null

  const used = await usedImages()

  // 1. Everything in UploadThing
  const appId = appIdFromToken() ?? appIdFromUrls(used.map((u) => u.url))
  if (!process.env.UPLOADTHING_TOKEN?.trim()) {
    warning = 'UPLOADTHING_TOKEN isn’t set, so only photos already used on the site are shown.'
  } else if (!appId) {
    warning = 'Couldn’t work out the UploadThing app, so only photos already used on the site are shown.'
  } else {
    try {
      const utapi = new UTApi()
      for (let offset = 0; offset < MAX_UPLOADTHING_FILES; offset += PAGE) {
        const res = await utapi.listFiles({ limit: PAGE, offset })
        for (const f of res.files) {
          if (f.status !== 'Uploaded' || !WEB_IMAGE.test(f.name)) continue
          byId.set(f.key, {
            url: `https://${appId}.ufs.sh/f/${f.key}`,
            name: f.name,
            uploadedAt: f.uploadedAt,
            size: f.size,
            usedIn: [],
          })
        }
        if (!res.hasMore) break
      }
    } catch (e) {
      console.error('[media] UploadThing listFiles failed:', e)
      warning = 'Couldn’t reach UploadThing just now, so only photos already used on the site are shown.'
    }
  }

  // 2. Images the site references (adds where-used, and older images hosted elsewhere)
  for (const { url, usage } of used) {
    const id = idFor(url)
    let item = byId.get(id)
    if (!item) {
      item = { url, name: nameFromUrl(url), uploadedAt: null, size: null, usedIn: [] }
      byId.set(id, item)
    }
    if (!item.usedIn.some((u) => u.kind === usage.kind && u.href === usage.href)) item.usedIn.push(usage)
  }

  const items = [...byId.values()].sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0))
  return { items, warning }
}
