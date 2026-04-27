import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { reviews } from '@/db'

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

  const { product_id, author_name, body: reviewBody, rating } = body as {
    product_id?: unknown
    author_name?: unknown
    body?: unknown
    rating?: unknown
  }

  // Validate required fields
  if (!product_id || typeof product_id !== 'string' || product_id.trim() === '') {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
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

  try {
    const [data] = await db.insert(reviews).values({
      productId: product_id.trim(),
      authorName: author_name.trim(),
      body: reviewBody.trim(),
      rating,
    }).returning()

    if (!data) {
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Failed to insert review:', err)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
