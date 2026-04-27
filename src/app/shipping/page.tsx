import type { Metadata } from 'next'
import { db, settings as settingsTable } from '@/db'
import { inArray } from 'drizzle-orm'
import { BUSINESS } from '@/lib/config/business'

export const metadata: Metadata = {
  title: 'Shipping Information',
  description: 'Shipping rates and delivery timelines for Twinkle Locs orders — domestic Nigerian delivery and international shipping enquiries.',
  openGraph: {
    title: 'Shipping Information | Twinkle Locs',
    description: 'Domestic Nigerian shipping rates and international enquiry process.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

const SHIPPING_KEYS = [
  'shipping_lagos_rate',
  'shipping_other_rate',
  'shipping_lagos_days',
  'shipping_other_days',
  'shipping_intl_message',
  'shipping_page_intro',
] as const

const defaults = {
  shipping_lagos_rate: '3000',
  shipping_other_rate: '4500',
  shipping_lagos_days: '1–2 business days',
  shipping_other_days: '3–5 business days',
  shipping_intl_message: "Hi, I'd like a shipping quote for an international order.",
  shipping_page_intro: 'We deliver across Nigeria.',
}

export default async function ShippingPage() {
  let rows: { key: string; value: string }[] = []
  try {
    rows = await db
      .select()
      .from(settingsTable)
      .where(inArray(settingsTable.key, [...SHIPPING_KEYS]))
  } catch (err) {
    console.error('Failed to fetch shipping settings:', err)
  }

  // Merge fetched rows over defaults — any missing key falls back to default
  const raw: Record<string, string> = { ...defaults }
  for (const row of rows) {
    raw[row.key] = row.value
  }

  // Parse numeric rates for formatting — fall back to raw string if non-numeric
  const lagosRate = parseInt(raw.shipping_lagos_rate, 10)
  const otherRate = parseInt(raw.shipping_other_rate, 10)

  const formatRate = (n: number, fallback: string) =>
    isNaN(n) ? fallback : '₦' + n.toLocaleString('en-NG')

  const lagosRateDisplay = formatRate(lagosRate, raw.shipping_lagos_rate)
  const otherRateDisplay = formatRate(otherRate, raw.shipping_other_rate)

  const waUrl = BUSINESS.whatsapp.url(raw.shipping_intl_message)

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Heading */}
      <h1 className="font-heading text-4xl font-bold text-charcoal mb-3">
        Shipping Information
      </h1>
      <p className="text-charcoal/60 mb-12">{raw.shipping_page_intro}</p>

      {/* Domestic Delivery */}
      <section className="mb-12">
        <h2 className="font-heading text-xl font-semibold text-charcoal mb-6">
          Domestic Delivery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Lagos card */}
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 space-y-3">
            <div className="flex items-center gap-2">
              {/* Location pin icon */}
              <svg
                className="w-4 h-4 text-gold shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-heading text-sm font-semibold text-charcoal/70 uppercase tracking-wider">
                Lagos
              </span>
            </div>
            <p className="font-heading text-3xl font-bold text-charcoal">{lagosRateDisplay}</p>
            <p className="text-sm text-charcoal/60">{raw.shipping_lagos_days}</p>
          </div>

          {/* All other states card */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-charcoal/50 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-heading text-sm font-semibold text-charcoal/70 uppercase tracking-wider">
                All Other States
              </span>
            </div>
            <p className="font-heading text-3xl font-bold text-charcoal">{otherRateDisplay}</p>
            <p className="text-sm text-charcoal/60">{raw.shipping_other_days}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-charcoal/40">
          Rates apply per order. Delivery is calculated from Lagos.
        </p>
      </section>

      {/* International Orders */}
      <section className="rounded-2xl border border-charcoal/10 bg-charcoal/[0.03] p-8">
        <h2 className="font-heading text-xl font-semibold text-charcoal mb-3">
          International Orders
        </h2>
        <p className="text-charcoal/60 mb-6">
          We offer international shipping on request. Rates depend on destination and order
          weight — send us a message on WhatsApp and we&apos;ll get back to you with a quote
          within 24 hours.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-heading font-semibold text-sm rounded-xl transition-colors"
        >
          {/* WhatsApp icon */}
          <svg
            className="w-5 h-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Request a Shipping Quote
        </a>
      </section>
    </main>
  )
}
