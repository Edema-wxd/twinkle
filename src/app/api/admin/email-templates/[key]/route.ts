import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailTemplates } from '@/db'
import { eq } from 'drizzle-orm'

const VALID_KEYS = ['confirmed', 'processing', 'shipped', 'delivered', 'review_reminder']

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await params

  if (!VALID_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid template key' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subject, bannerColor, bannerLabel, body: templateBody } = body as Record<string, unknown>

  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (typeof subject === 'string' && subject.trim()) patch.subject = subject.trim()
  if (typeof bannerColor === 'string' && bannerColor.trim()) patch.bannerColor = bannerColor.trim()
  if (typeof bannerLabel === 'string' && bannerLabel.trim()) patch.bannerLabel = bannerLabel.trim()
  if (typeof templateBody === 'string' && templateBody.trim()) patch.body = templateBody.trim()

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(emailTemplates)
    .set(patch)
    .where(eq(emailTemplates.key, key))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json({ template: updated })
}
