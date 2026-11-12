import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db, newsletterSubscribers } from '@/db'
import { isUuid } from '@/lib/content-api'

/** Remove someone from the newsletter (e.g. they asked on WhatsApp). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  try {
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter] remove subscriber failed:', err)
    return NextResponse.json({ error: 'Couldn’t remove them. Please try again.' }, { status: 500 })
  }
}
