import { requireAdminSession } from '@/lib/auth/server'
import { PromoCodesManager, type PromoCode } from '../../../_components/PromoCodesManager'
import { listAdminPromoCodes, welcomeCodeSummary, type PromoCodeRow } from '../../../_lib/promo-codes'

export const metadata = {
  title: 'Promo Codes — Twinkle Locs Admin',
}

function toDto(c: PromoCodeRow): PromoCode {
  return {
    ...c,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }
}

export default async function AdminPromoCodesPage() {
  await requireAdminSession()

  // Welcome codes from the ad landing page are counted, not listed (they pile up)
  const [codes, welcome] = await Promise.all([listAdminPromoCodes(), welcomeCodeSummary()])

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Promo Codes</h1>
        <p className="text-stone-400 text-sm mt-1">
          Create free-shipping or discount codes with optional usage limits, a minimum order and expiry dates.
        </p>
      </div>

      <PromoCodesManager initialCodes={codes.map(toDto)} welcomeSummary={welcome} />
    </div>
  )
}
