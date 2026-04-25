import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (error || !data) {
    return Response.json(null, { status: 404 })
  }

  return Response.json(data)
}
