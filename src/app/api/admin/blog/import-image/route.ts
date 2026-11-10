import { NextRequest, NextResponse } from 'next/server'
import { UTApi, UTFile } from 'uploadthing/server'
import { getAdminSession } from '@/lib/auth/server'

/**
 * Copy a remote image (from a pasted/imported Markdown post) into our
 * UploadThing bucket. The site's CSP only allows our own image host, so
 * hot-linked images would show as broken on the live page.
 */

const MAX_BYTES = 8 * 1024 * 1024
const utapi = new UTApi()

function isPublicHttpUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  // Basic SSRF guard: no localhost, link-local or private ranges
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '[::1]' ||
    host.startsWith('[fc') ||
    host.startsWith('[fd') ||
    host.startsWith('[fe80')
  ) {
    return null
  }
  return url
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null
  const url = typeof body?.url === 'string' ? isPublicHttpUrl(body.url) : null
  if (!url) return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })

  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return NextResponse.json({ error: `Image host replied ${res.status}` }, { status: 502 })
    const type = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!type.startsWith('image/') || type === 'image/svg+xml') {
      return NextResponse.json({ error: 'That link is not a photo' }, { status: 415 })
    }
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_BYTES) return NextResponse.json({ error: 'Image is larger than 8MB' }, { status: 413 })
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Image is larger than 8MB' }, { status: 413 })

    const ext = type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'img'
    const base = url.pathname.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60) || 'blog-image'
    const file = new UTFile([buf], `${base}.${ext}`, { type })
    const uploaded = await utapi.uploadFiles(file)
    if (uploaded.error || !uploaded.data) {
      console.error('[import-image] upload failed', uploaded.error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
    }
    return NextResponse.json({ url: uploaded.data.ufsUrl })
  } catch (err) {
    console.error('[import-image] failed', err)
    return NextResponse.json({ error: 'Could not fetch that image' }, { status: 502 })
  }
}
