import Link from 'next/link'
import { freeDeliveryLine } from '@/lib/checkout/freeDelivery'
import { formatNaira, type ShippingInfo } from '@/lib/checkout/shippingInfo'
import { Copy, DisplayText } from './Copy'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { LockIcon } from './icons'
import { CONTAINER, H2, H3, REVEAL, SECTION_Y, TEXT_LINK } from './ui'

type Props = {
  shipping: Pick<ShippingInfo, 'lagosFrom' | 'otherRate' | 'otherDays' | 'intlMessage' | 'freeLagosOver'>
  returnsLine: string
}

const card = 'rounded-3xl bg-white p-6 ring-1 ring-forest/10 md:p-8'

/** The full cost, and that paying is safe, before checkout. Fees come from Admin → Shipping, the same numbers checkout charges. */
export function ShippingPayment({ shipping, returnsLine }: Props) {
  return (
    <section aria-labelledby="delivery-title" data-reveal className={`bg-cream ${SECTION_Y} ${REVEAL}`}>
      <div className={CONTAINER}>
        <h2 id="delivery-title" className={H2}>
          <DisplayText text="Delivery & payment" />
        </h2>

        <div className="mt-8 grid gap-4 md:mt-10 lg:grid-cols-2 lg:gap-6">
          <div className={card}>
            <h3 className={H3}>Delivery</h3>
            <table className="mt-4 w-full text-left font-body text-base leading-snug">
              <caption className="sr-only">Delivery cost and time by destination</caption>
              <thead>
                <tr className="font-heading text-[13px] uppercase tracking-[0.1em] text-forest/80">
                  <th scope="col" className="pb-2 pr-3 font-semibold">Where</th>
                  <th scope="col" className="pb-2 pr-3 font-semibold">Cost</th>
                  <th scope="col" className="pb-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10 text-charcoal/80">
                <tr className="align-top">
                  <th scope="row" className="py-3 pr-3 font-heading font-semibold text-forest">Lagos</th>
                  <td className="py-3 pr-3 font-semibold text-charcoal">From {formatNaira(shipping.lagosFrom)}</td>
                  <td className="py-3">Same day in most areas</td>
                </tr>
                <tr className="align-top">
                  <th scope="row" className="py-3 pr-3 font-heading font-semibold text-forest">Rest of Nigeria</th>
                  <td className="py-3 pr-3 font-semibold text-charcoal">{formatNaira(shipping.otherRate)}</td>
                  <td className="py-3">{shipping.otherDays}</td>
                </tr>
                <tr className="align-top">
                  <th scope="row" className="py-3 pr-3 font-heading font-semibold text-forest">International</th>
                  <td className="py-3 pr-3" colSpan={2}>
                    <LandingWhatsAppLink location="fab" trackAs="shipping" text={shipping.intlMessage} className={`inline-flex min-h-11 items-center -my-2.5 ${TEXT_LINK}`}>
                      Get a quote on WhatsApp
                    </LandingWhatsAppLink>
                  </td>
                </tr>
              </tbody>
            </table>
            {shipping.freeLagosOver > 0 && (
              <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 font-body text-sm font-semibold text-green-800 ring-1 ring-green-200">
                {freeDeliveryLine(shipping.freeLagosOver)}
              </p>
            )}
            <p className="mt-4 font-body text-sm text-charcoal/80">
              You see the exact fee for your area at checkout, before you pay.{' '}
              <Link href="/shipping" className={TEXT_LINK}>
                Full shipping info
              </Link>
            </p>
          </div>

          <div className={card}>
            <h3 className={H3}>Pay your way, securely</h3>
            <ul className="mt-4 divide-y divide-forest/10 font-body text-base">
              <li className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-heading font-semibold text-forest">Card</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <VisaMark />
                  <MastercardMark />
                  <VerveMark />
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-3">
                <span className="font-heading font-semibold text-forest">Bank transfer</span>
                <BankMark />
              </li>
              <li className="flex items-center justify-between gap-3 py-3">
                <span className="font-heading font-semibold text-forest">USSD</span>
                <PhoneMark />
              </li>
            </ul>
            <p className="mt-4 flex items-start gap-2 font-body text-sm text-charcoal/80">
              <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
              Payments are processed by Paystack. We never see your card details.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center font-body text-base text-charcoal/80">
          <Copy text={returnsLine} />{' '}
          <Link href="/returns" className={TEXT_LINK}>
            Returns &amp; refunds
          </Link>
        </p>
      </div>
    </section>
  )
}

// Payment marks: simple inline drawings (no third-party images), each named for screen readers

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span title={label} className="inline-flex h-8 min-w-12 items-center justify-center gap-1 rounded-md bg-white px-2 ring-1 ring-charcoal/15">
      <span className="sr-only">{label}</span>
      {children}
    </span>
  )
}

function VisaMark() {
  return (
    <Badge label="Visa">
      <svg viewBox="0 0 48 16" className="h-3.5 w-auto" aria-hidden="true">
        <text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="0.5">
          VISA
        </text>
      </svg>
    </Badge>
  )
}

function MastercardMark() {
  return (
    <Badge label="Mastercard">
      <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-hidden="true">
        <circle cx="12" cy="10" r="8" fill="#EB001B" />
        <circle cx="20" cy="10" r="8" fill="#F79E1B" />
        <path d="M16 3.07a8 8 0 010 13.86 8 8 0 010-13.86z" fill="#FF5F00" />
      </svg>
    </Badge>
  )
}

function VerveMark() {
  return (
    <Badge label="Verve">
      <svg viewBox="0 0 56 16" className="h-3.5 w-auto" aria-hidden="true">
        <circle cx="7" cy="8" r="6.5" fill="#E2231A" />
        <text x="35" y="12.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="700" fill="#00425F">
          verve
        </text>
      </svg>
    </Badge>
  )
}

function BankMark() {
  return (
    <Badge label="Bank transfer">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-forest" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10l9-6 9 6" />
        <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
        <path d="M3 21h18" />
      </svg>
    </Badge>
  )
}

function PhoneMark() {
  return (
    <Badge label="USSD">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-forest" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 6h4M10 10h.01M14 10h.01M10 13.5h.01M14 13.5h.01M10 17h.01M14 17h.01" />
      </svg>
    </Badge>
  )
}
