import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { reviews } from '@/db'
import { eq } from 'drizzle-orm'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  try {
    const [data] = await db
      .update(reviews)
      .set({
        authorName: author_name.trim(),
        body: (reviewBody as string).trim(),
        rating,
      })
      .where(eq(reviews.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Failed to update review:', err)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await db.delete(reviews).where(eq(reviews.id, id))
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('Failed to delete review:', err)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
