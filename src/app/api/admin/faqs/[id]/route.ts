import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { faqs } from '@/db'
import { eq } from 'drizzle-orm'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { category, question, answer, display_order } = body as {
    category?: unknown
    question?: unknown
    answer?: unknown
    display_order?: unknown
  }

  // Build update payload — only include provided fields
  const updatePayload: Record<string, string | number> = {}
  if (typeof category === 'string' && category.trim() !== '') {
    updatePayload.category = category.trim()
  }
  if (typeof question === 'string' && question.trim() !== '') {
    updatePayload.question = question.trim()
  }
  if (typeof answer === 'string' && answer.trim() !== '') {
    updatePayload.answer = answer.trim()
  }
  if (typeof display_order === 'number') {
    updatePayload.displayOrder = display_order
  }

  // Check row exists
  const [existing] = await db
    .select({ id: faqs.id })
    .from(faqs)
    .where(eq(faqs.id, id))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  try {
    await db.update(faqs).set(updatePayload).where(eq(faqs.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to update FAQ:', err)
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check row exists
  const [existing] = await db
    .select({ id: faqs.id })
    .from(faqs)
    .where(eq(faqs.id, id))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  try {
    await db.delete(faqs).where(eq(faqs.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete FAQ:', err)
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 })
  }
}
