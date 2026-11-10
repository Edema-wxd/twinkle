import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { faqs } from '@/db'
import { eq } from 'drizzle-orm'
import { revalidateFaqs } from '@/lib/content-api'

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { category, question, answer, display_order, is_featured } = body as {
    category?: unknown
    question?: unknown
    answer?: unknown
    display_order?: unknown
    is_featured?: unknown
  }

  // Validate required fields
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  if (!question || typeof question !== 'string' || question.trim() === '') {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }
  if (!answer || typeof answer !== 'string' || answer.trim() === '') {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 })
  }

  try {
    const [data] = await db.insert(faqs).values({
      category: category.trim(),
      question: question.trim(),
      answer: answer.trim(),
      displayOrder: typeof display_order === 'number' ? display_order : 0,
      isFeatured: is_featured === true,
    }).returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to save FAQ' }, { status: 500 })
    }

    revalidateFaqs()
    return NextResponse.json({ faq: data }, { status: 201 })
  } catch (err) {
    console.error('Failed to insert FAQ:', err)
    return NextResponse.json({ error: 'Failed to save FAQ' }, { status: 500 })
  }
}

/**
 * Bulk reorder: { order: [{ id, display_order }] }.
 * Sent by the drag-and-drop list in /admin/faqs.
 */
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const order = (body as { order?: unknown })?.order
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order must be an array' }, { status: 400 })
  }

  const items = order.filter(
    (o): o is { id: string; display_order: number } =>
      typeof o?.id === 'string' && typeof o?.display_order === 'number',
  )
  if (items.length === 0 || items.length > 500) {
    return NextResponse.json({ error: 'order is empty or too large' }, { status: 400 })
  }

  try {
    await Promise.all(
      items.map((o) => db.update(faqs).set({ displayOrder: o.display_order }).where(eq(faqs.id, o.id))),
    )
    revalidateFaqs()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to reorder FAQs:', err)
    return NextResponse.json({ error: 'Failed to reorder FAQs' }, { status: 500 })
  }
}
