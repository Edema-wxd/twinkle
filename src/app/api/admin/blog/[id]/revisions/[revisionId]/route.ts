import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { isUuid } from '@/lib/content-api'
import { getRevision } from '@/lib/blog/revisions'

/** One saved version, to load back into the editor (nothing changes until the admin saves). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, revisionId } = await params
  if (!isUuid(id) || !isUuid(revisionId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const snapshot = await getRevision(id, revisionId).catch(() => null)
  if (!snapshot) return NextResponse.json({ error: 'That version no longer exists.' }, { status: 404 })
  return NextResponse.json({ snapshot })
}
