import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'
import { formatNaira, getShippingInfo } from '@/lib/checkout/shippingInfo'

// Prices come from Admin → Shipping; the admin API revalidates this page on save.
export async function generateMetadata(): Promise<Metadata> {
  const info = await getShippingInfo()
  const title = 'Shipping Rates Nigeria - Lagos & Nationwide | Twinkle Locs'
  const fastest = info.zones[0]
  const description = `Lagos delivery from ${formatNaira(info.lagosFrom)} (${fastest.deliveryTime} in the ${fastest.name}). Other Nigerian states ${formatNaira(info.otherRate)}, ${info.otherDays}. International shipping on request.`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/shipping' },
    openGraph: { title, description, images: [{ url: '/og-image.jpg', width: 1200, height: 630 }], type: 'website' },
  }
}

export default async function ShippingPage() {
  const info = await getShippingInfo()
  const waUrl = BUSINESS.whatsapp.url(info.intlMessage)

  return (
    <div className="bg-cream">
      <header className="relative overflow-hidden bg-forest">
        <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-14 md:pt-20 md:pb-20">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">Delivery</p>
          <h1 className="mt-8 font-display text-5xl leading-[1.2] text-cream md:mt-10 md:text-7xl">Shipping &amp; delivery</h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-cream/80 md:text-lg">{info.pageIntro}</p>

          <dl className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { k: 'Lagos', v: `${formatNaira(info.lagosFrom)} to ${formatNaira(info.lagosTo)}`, s: 'By delivery area, same day in most of Lagos' },
              { k: 'Rest of Nigeria', v: formatNaira(info.otherRate), s: `Flat rate, ${info.otherDays}` },
              { k: 'International', v: 'On request', s: 'Quoted on WhatsApp within 24 hours' },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl bg-cream/[0.06] p-4 ring-1 ring-cream/15">
                <dt className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">{c.k}</dt>
                <dd className="mt-1 font-heading text-xl font-bold text-cream">{c.v}</dd>
                <dd className="mt-0.5 font-body text-xs text-cream/75">{c.s}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-14 px-4 py-14 md:py-20">
        {/* Lagos zones */}
        <section aria-labelledby="lagos-zones">
          <div className="mb-6">
            <h2 id="lagos-zones" className="font-display text-4xl leading-[1.2] text-forest">Lagos delivery zones</h2>
            <p className="mt-2 max-w-2xl font-body text-charcoal/75">
              We dispatch from Lekki Phase 1, so your fee depends on where you are. Pick your area at checkout and you&apos;ll
              see the exact price before you pay. Times are from dispatch.
            </p>
          </div>

          {/* Table on larger screens */}
          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-forest/10 md:block">
            <table className="w-full text-left">
              <thead className="bg-forest text-cream">
                <tr className="font-heading text-xs uppercase tracking-[0.12em]">
                  <th scope="col" className="px-5 py-3 font-semibold">Zone</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Areas</th>
                  <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Delivery time</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10 font-body text-sm">
                {info.zones.map((z) => (
                  <tr key={z.id} className="align-top even:bg-stone/60">
                    <th scope="row" className="px-5 py-4 font-heading font-semibold text-forest whitespace-nowrap">
                      {z.id}. {z.name}
                    </th>
                    <td className="px-5 py-4 text-charcoal/80">{z.areas.join(', ')}</td>
                    <td className="px-5 py-4 text-charcoal/80 whitespace-nowrap">{z.deliveryTime}</td>
                    <td className="px-5 py-4 text-right font-heading font-semibold text-forest whitespace-nowrap">{formatNaira(z.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="space-y-3 md:hidden">
            {info.zones.map((z) => (
              <li key={z.id} className="rounded-2xl bg-white p-4 ring-1 ring-forest/10">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-heading font-semibold text-forest">
                    {z.id}. {z.name}
                  </p>
                  <p className="font-heading font-bold text-forest">{formatNaira(z.fee)}</p>
                </div>
                <p className="mt-1 font-body text-xs font-semibold uppercase tracking-[0.1em] text-gold-deep">{z.deliveryTime}</p>
                <p className="mt-2 font-body text-sm text-charcoal/75">{z.areas.join(', ')}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-body text-sm text-charcoal/70">
            Not sure which zone you&apos;re in, or your area isn&apos;t listed?{' '}
            <a
              href={BUSINESS.whatsapp.url('Hi, which delivery zone is my area in?')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-deep"
            >
              Ask us on WhatsApp
            </a>
            .
          </p>
        </section>

        {/* Other states */}
        <section aria-labelledby="other-states" className="grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-forest/10 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 id="other-states" className="font-display text-4xl leading-[1.2] text-forest">Everywhere else in Nigeria</h2>
            <p className="mt-2 max-w-xl font-body text-charcoal/75">
              One flat rate to every other state, sent by courier. We&apos;ll WhatsApp you the tracking details once your
              order is on its way.
            </p>
          </div>
          <div className="md:text-right">
            <p className="font-heading text-4xl font-bold text-forest">{formatNaira(info.otherRate)}</p>
            <p className="font-body text-sm text-charcoal/70">{info.otherDays}</p>
          </div>
        </section>

        {/* International */}
        <section aria-labelledby="international" className="relative overflow-hidden rounded-3xl bg-forest p-6 text-cream md:p-8">
          <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.08]" />
          <div className="relative">
            <h2 id="international" className="font-display text-4xl leading-[1.2] text-gold-light">International orders</h2>
            <p className="mt-2 max-w-xl font-body text-cream/80">
              We ship worldwide on request. The price depends on the destination and order weight, so message us and
              we&apos;ll send a quote within 24 hours.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-gold-light px-6 font-heading text-sm font-semibold text-forest transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
            >
              Request a quote on WhatsApp
            </a>
          </div>
        </section>

        <p className="text-center font-body text-sm text-charcoal/70">
          Delivery fees are per order, whatever the size. Questions about an order you&apos;ve placed?{' '}
          <Link href="/faq" className="text-forest underline decoration-gold underline-offset-4">See the FAQ</Link>.
        </p>
      </div>
    </div>
  )
}
