import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const adminClient = createAdminClient()

  // Verify order exists
  const { data: existing, error: fetchError } = await adminClient
    .from('orders')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Update status
  const { error: updateError } = await adminClient
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update order status:', updateError)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }

  return NextResponse.json({ id, status })
}
