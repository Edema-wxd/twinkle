import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { author_name, reviewBody, rating } = body as {
    author_name?: unknown
    reviewBody?: unknown
    rating?: unknown
  }

  if (!author_name || typeof author_name !== 'string' || author_name.trim() === '') {
    return NextResponse.json({ error: 'author_name is required' }, { status: 400 })
  }
  if (!reviewBody || typeof reviewBody !== 'string' || reviewBody.trim() === '') {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }
  if (
    rating === undefined ||
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: 'rating must be an integer between 1 and 5' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('reviews')
    .update({
      author_name: author_name.trim(),
      body: (reviewBody as string).trim(),
      rating,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update review:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('reviews').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete review:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
