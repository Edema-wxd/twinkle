import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductForm } from '../../../../_components/ProductForm'

export const metadata = {
  title: 'Edit Product — Twinkle Locs Admin',
}

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { id } = await params

  // Fetch product by ID using service-role client
  const adminClient = createAdminClient()
  const result = await adminClient
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (result.error || !result.data) {
    notFound()
  }

  const product = result.data

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Edit product</h1>
        <p className="text-stone-400 text-sm mt-1">
          Update the product details below.
        </p>
      </div>

      <ProductForm product={product} />
    </div>
  )
}
