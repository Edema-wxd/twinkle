import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    updatePayload.display_order = display_order
  }

  const adminClient = createAdminClient()

  // Check row exists
  const { data: existing, error: fetchError } = await adminClient
    .from('faqs')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch FAQ:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('faqs')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    console.error('Failed to update FAQ:', error)
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
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

  const adminClient = createAdminClient()

  // Check row exists
  const { data: existing, error: fetchError } = await adminClient
    .from('faqs')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch FAQ:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  const { error } = await adminClient.from('faqs').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete FAQ:', error)
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
