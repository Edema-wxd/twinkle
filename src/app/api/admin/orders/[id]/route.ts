import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { orders } from '@/db'
import { eq } from 'drizzle-orm'

const VALID_STATUSES = ['paid', 'processing', 'shipped', 'delivered'] as const
type OrderStatus = (typeof VALID_STATUSES)[number]

function isValidStatus(s: string): s is OrderStatus {
  return (VALID_STATUSES as readonly string[]).includes(s)
}

export async function PATCH(
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

  // Parse and validate request body
  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { status } = body

  if (!status || !isValidStatus(status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // Verify order exists
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Update status
  try {
    await db.update(orders).set({ status }).where(eq(orders.id, id))
  } catch (err) {
    console.error('Failed to update order status:', err)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }

  return NextResponse.json({ id, status })
}
