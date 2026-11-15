import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { isUuid } from '@/lib/content-api'
import { listRevisions } from '@/lib/blog/revisions'

/** Saved versions of a post, newest first. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  try {
    return NextResponse.json({ revisions: await listRevisions(id) })
  } catch (err) {
    console.error('[blog] listing revisions failed:', err)
    return NextResponse.json({ error: 'Couldn’t load the history. Please try again.' }, { status: 500 })
  }
}
