import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'
import { PolicyPage } from '@/components/PolicyPage'

const title = 'Returns & Refunds | Twinkle Locs'
const description =
  'Wrong, damaged or faulty beads? Tell us within 48 hours and we will replace or refund them. Unopened packs can be returned within 7 days of delivery.'

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/returns' },
  openGraph: { title, description, images: [{ url: '/og-image.jpg', width: 1200, height: 630 }], type: 'website' },
}

const wa = (msg: string) => BUSINESS.whatsapp.url(msg)

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Customer care"
      title="Returns & refunds"
      updated="12 November 2026"
      intro={
        <p>
          We want you to love your beads. If something isn&apos;t right, message us and we&apos;ll sort it out. Here&apos;s exactly how
          it works.
        </p>
      }
      sections={[
        {
          id: 'something-wrong',
          title: 'Wrong, damaged or faulty items',
          body: (
            <>
              <p>
                If we sent the wrong item, or something arrived damaged or faulty, tell us within <strong>48 hours of delivery</strong>.
                Send your order reference and a photo on{' '}
                <a href={wa('Hi, there is a problem with my order. My order reference is ')} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{' '}
                or to <a href={`mailto:${BUSINESS.support.email}`}>{BUSINESS.support.email}</a>.
              </p>
              <p>
                We&apos;ll send a replacement or give you a full refund, including the delivery fee. You won&apos;t pay anything to send
                it back.
              </p>
            </>
          ),
        },
        {
          id: 'change-of-mind',
          title: 'Changed your mind?',
          body: (
            <>
              <p>
                You can return <strong>unopened, unused packs</strong> within <strong>7 days of delivery</strong>. Message us first so we
                can tell you where to send them.
              </p>
              <ul>
                <li>You pay the cost of sending them back to us.</li>
                <li>Once they arrive in their original condition, we refund the price of the beads. The original delivery fee isn&apos;t refunded.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'not-returnable',
          title: 'What we can’t take back',
          body: (
            <>
              <p>Beads go into your hair, so for hygiene we can&apos;t accept returns of:</p>
              <ul>
                <li>Packs that have been opened, or beads that have been threaded or worn</li>
                <li>Tools that have been used, such as shears</li>
              </ul>
              <p>This doesn&apos;t affect wrong, damaged or faulty items, which we always put right.</p>
            </>
          ),
        },
        {
          id: 'delivery-problems',
          title: 'Late or missing deliveries',
          body: (
            <>
              <p>
                If your order hasn&apos;t arrived within the delivery time shown at checkout (see{' '}
                <Link href="/shipping">delivery times</Link>), message us with your order reference. We&apos;ll chase the rider or
                courier. If a parcel is lost on the way, we&apos;ll send it again or refund you in full.
              </p>
            </>
          ),
        },
        {
          id: 'refunds',
          title: 'How refunds are paid',
          body: (
            <>
              <p>
                Refunds go back to the card or bank account you paid with, through Paystack. We start the refund within{' '}
                <strong>2 working days</strong> of agreeing it (or of receiving a return). Your bank usually shows it within 5 to 10
                working days.
              </p>
              <p>If you were charged twice or charged the wrong amount, message us and we&apos;ll refund the difference straight away.</p>
            </>
          ),
        },
        {
          id: 'international',
          title: 'International orders',
          body: (
            <p>
              Wrong, damaged and faulty items are covered the same way. Because international delivery is quoted per order, we handle
              change-of-mind returns case by case. Message us before sending anything back.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Start a return',
          body: (
            <>
              <p>Have your order reference ready. It&apos;s in your confirmation email and starts with &quot;tw-&quot;.</p>
              <p className="flex flex-wrap gap-3">
                <a
                  href={wa("Hi, I'd like to start a return. My order reference is ")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!no-underline inline-flex min-h-12 items-center rounded-lg bg-whatsapp-dark px-6 font-heading text-sm font-semibold !text-white hover:bg-whatsapp-darker"
                >
                  Message us on WhatsApp
                </a>
                <a
                  href={`mailto:${BUSINESS.support.email}?subject=${encodeURIComponent('Return request')}`}
                  className="!no-underline inline-flex min-h-12 items-center rounded-lg px-6 font-heading text-sm font-semibold ring-1 ring-forest/30 hover:bg-white"
                >
                  Email {BUSINESS.support.email}
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
