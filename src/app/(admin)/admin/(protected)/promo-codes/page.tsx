import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { promoCodes } from '@/db'
import { PromoCodesManager } from '../../../_components/PromoCodesManager'

export const metadata = {
  title: 'Promo Codes — Twinkle Locs Admin',
}

export default async function AdminPromoCodesPage() {
  await requireAdminSession()

  const codes = await db
    .select()
    .from(promoCodes)
    .orderBy(promoCodes.createdAt)

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Promo Codes</h1>
        <p className="text-stone-400 text-sm mt-1">
          Create free-shipping or discount codes with optional usage limits and expiry dates.
        </p>
      </div>

      <PromoCodesManager initialCodes={codes.map((c) => ({
        ...c,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      }))} />
    </div>
  )
}
