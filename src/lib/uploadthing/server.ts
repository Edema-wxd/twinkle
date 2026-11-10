import { UTApi } from 'uploadthing/server'
import { sql } from 'drizzle-orm'
import { db } from '@/db'

const utapi = new UTApi()

export function fileKeyFromUploadthingUrl(url: string): string | null {
  // We only ever delete UploadThing-hosted files.
  // Legacy URLs (e.g. Supabase Storage) must never be touched.
  if (!url.includes('.ufs.sh') && !url.includes('utfs.io')) return null

  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf('/f/')
    if (idx === -1) return null
    const key = u.pathname.slice(idx + 3).replace(/^\/+/, '')
    return key || null
  } catch {
    return null
  }
}

/**
 * Is this file still shown anywhere? Photos are shared through the photo
 * library (a product photo can also be a blog cover or sit inside a post), so
 * a file is only safe to delete once nothing references it. Matches on the
 * file key, so the same file under a utfs.io or ufs.sh address counts too.
 * Call this AFTER the change that dropped the reference has been saved.
 */
async function keyInUse(key: string): Promise<boolean> {
  const pattern = `%${key.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const res = await db.execute(sql`
    SELECT
      EXISTS (SELECT 1 FROM blog_posts WHERE featured_image LIKE ${pattern} OR body LIKE ${pattern})
      OR EXISTS (SELECT 1 FROM products WHERE image LIKE ${pattern} OR array_to_string(images, ' ') LIKE ${pattern})
      OR EXISTS (SELECT 1 FROM about_sections WHERE image_url LIKE ${pattern})
      AS used
  `)
  const rows = (Array.isArray(res) ? res : (res as { rows?: unknown[] }).rows ?? []) as { used?: boolean }[]
  // If the answer is unclear, keep the file: a stray file costs storage, a missing one breaks the site
  return rows[0]?.used !== false
}

/**
 * Deletes UploadThing files that are no longer used anywhere on the site.
 * Files still referenced by a product, blog post or page are kept.
 */
export async function deleteUploadthingFilesByUrls(urls: string[]) {
  const keys = Array.from(
    new Set(
      urls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => fileKeyFromUploadthingUrl(u.trim()))
        .filter((k): k is string => Boolean(k))
    )
  )

  if (keys.length === 0) return { deleted: 0, attempted: 0 }

  const unused: string[] = []
  for (const key of keys) {
    if (!(await keyInUse(key))) unused.push(key)
  }
  if (unused.length > 0) await utapi.deleteFiles(unused)
  return { deleted: unused.length, attempted: keys.length }
}
