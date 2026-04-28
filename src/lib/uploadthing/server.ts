import { UTApi } from 'uploadthing/server'

const utapi = new UTApi()

function fileKeyFromUploadthingUrl(url: string): string | null {
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

  await utapi.deleteFiles(keys)
  return { deleted: keys.length, attempted: keys.length }
}

