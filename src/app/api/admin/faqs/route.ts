import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('faqs')
    .insert({
      category: category.trim(),
      question: question.trim(),
      answer: answer.trim(),
      display_order: typeof display_order === 'number' ? display_order : 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert FAQ:', error)
    return NextResponse.json({ error: 'Failed to save FAQ' }, { status: 500 })
  }

  return NextResponse.json({ faq: data }, { status: 201 })
}
