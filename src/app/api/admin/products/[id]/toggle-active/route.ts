import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
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

  // Fetch current is_active value
  const { data: product, error: fetchError } = await adminClient
    .from('products')
    .select('id, is_active')
    .eq('id', id)
    .single()

  if (fetchError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const newValue = !product.is_active

  // Update is_active
  const { error: updateError } = await adminClient
    .from('products')
    .update({ is_active: newValue })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to toggle product is_active:', updateError)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }

  return NextResponse.json({ is_active: newValue })
}
