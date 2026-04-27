import { requireAdminSession } from '@/lib/auth/server'
import { ProductForm } from '../../../../_components/ProductForm'

export const metadata = {
  title: 'New Product — Twinkle Locs Admin',
}

export default async function NewProductPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">New product</h1>
        <p className="text-stone-400 text-sm mt-1">
          Fill in the details below to create a new product.
        </p>
      </div>

      <ProductForm />
    </div>
  )
}
