import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { listMediaLibrary } from '@/lib/media-library'

export const dynamic = 'force-dynamic'

/** Previously uploaded photos, newest first, for the admin image picker. */
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const library = await listMediaLibrary()
    return NextResponse.json(library, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[media] Failed to load library:', e)
    return NextResponse.json({ error: 'Couldn’t load your photos. Try again in a moment.' }, { status: 500 })
  }
}
