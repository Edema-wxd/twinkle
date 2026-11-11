'use client';

import Link from 'next/link';
import type { PublicOrder, PublicOrderStatus } from '@/lib/orders/publicOrder';
import { THREAD_COLOURS } from '@/lib/cart/threadColours';
import { BUSINESS } from '@/lib/config/business';

interface OrderConfirmationViewProps {
  order: PublicOrder;
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

/** Headline and message for each stage, so a customer coming back later sees where their order is. */
const HEADER: Record<PublicOrderStatus, { title: string; body: string; icon: 'tick' | 'wait' | 'truck' | 'gift' }> = {
  payment_review: {
    title: 'Payment received',
    body: 'Thank you! We need to double-check a detail of your payment before we prepare your order. We’ll be in touch on WhatsApp or email shortly. You don’t need to pay again.',
    icon: 'wait',
  },
  paid: {
    title: 'Thank you, your order is confirmed',
    body: 'We’ve emailed your receipt and will start preparing your beads shortly.',
    icon: 'tick',
  },
  processing: {
    title: 'Your order is being prepared',
    body: 'We’re packing your beads now. We’ll let you know as soon as they’re on their way.',
    icon: 'tick',
  },
  shipped: {
    title: 'Your order is on its way',
    body: 'Your beads have left us. Keep your phone close for the delivery.',
    icon: 'truck',
  },
  delivered: {
    title: 'Your order has been delivered',
    body: 'We hope you love your new beads. Tag us on Instagram so we can see how you style them.',
    icon: 'gift',
  },
};

const ICON_PATH = {
  tick: 'M5 13l4 4L19 7',
  wait: 'M12 8v4l2.5 2.5M12 3a9 9 0 100 18 9 9 0 000-18z',
  truck: 'M3 7h11v8H3zM14 10h4l3 3v2h-7M7.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1zm0 0c1.5-3 5-3 5-1s-3 1-5 1z',
};

/** Progress tracker steps; payment_review sits before them all. */
const STEPS: { status: PublicOrderStatus; label: string }[] = [
  { status: 'paid', label: 'Confirmed' },
  { status: 'processing', label: 'Preparing' },
  { status: 'shipped', label: 'On its way' },
  { status: 'delivered', label: 'Delivered' },
];

export function OrderConfirmationView({ order }: OrderConfirmationViewProps) {
  const threadColourMap = Object.fromEntries(THREAD_COLOURS.map((c) => [c.id, c]));
  const header = HEADER[order.status];
  const underReview = order.status === 'payment_review';
  const currentStep = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header: reflects where the order is now */}
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${underReview ? 'bg-gold/20' : 'bg-forest/15'}`}
        >
          <svg
            className={`w-8 h-8 ${underReview ? 'text-gold-deep' : 'text-forest'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={ICON_PATH[header.icon]} />
          </svg>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-forest">{header.title}</h1>
        <p className="font-body text-charcoal/70 mt-3 max-w-md">{header.body}</p>
        <p className="font-mono text-sm text-charcoal/50 mt-3">Order reference: {order.reference}</p>
      </div>

      {/* Progress tracker (hidden while the payment is being checked) */}
      {!underReview && (
        <ol className="mt-8 grid grid-cols-4 gap-1" aria-label="Order progress">
          {STEPS.map((step, i) => {
            const done = i <= currentStep;
            const current = i === currentStep;
            return (
              <li key={step.status} aria-current={current ? 'step' : undefined} className="flex flex-col items-center gap-2 text-center">
                <span className={`h-1.5 w-full rounded-full ${done ? 'bg-forest' : 'bg-charcoal/10'}`} aria-hidden="true" />
                <span className={`font-heading text-xs ${current ? 'font-semibold text-forest' : done ? 'text-forest/80' : 'text-charcoal/50'}`}>
                  {step.label}
                  <span className="sr-only">{current ? ' (current)' : done ? ' (done)' : ''}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Tracking number, once shipped */}
      {order.tracking_number && (
        <div className="mt-6 rounded-xl bg-white ring-1 ring-forest/15 p-4 text-center">
          <p className="font-heading text-xs uppercase tracking-wide text-charcoal/60">Tracking number</p>
          <p className="mt-1 font-mono text-lg text-forest select-all">{order.tracking_number}</p>
        </div>
      )}

      {/* Order summary card */}
      <div className="bg-stone/30 rounded-xl p-6 mt-8">
        <h2 className="font-heading text-sm font-semibold text-forest uppercase tracking-wide mb-4">Your items</h2>

        <ul className="space-y-4">
          {order.items.map((item) => {
            const colour = item.thread_colour ? threadColourMap[item.thread_colour] : null;
            return (
              <li key={item.id} className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-semibold text-forest leading-snug">{item.product_name}</p>
                  <p className="font-body text-xs text-charcoal/60 mt-0.5">
                    {item.variant_name}
                    {item.tier_qty > 1 && <> · Pack of {item.tier_qty}</>}
                    {colour && (
                      <>
                        {' '}
                        <span className="inline-flex items-center gap-1">
                          ·{' '}
                          <span className="w-2.5 h-2.5 rounded-full inline-block ring-1 ring-charcoal/10" style={{ backgroundColor: colour.hex }} aria-hidden="true" />
                          {colour.label} thread
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-heading text-sm text-charcoal/60">
                    <span className="sr-only">Quantity </span>×{item.quantity}
                  </p>
                  <p className="font-heading text-sm font-semibold text-forest">{naira(item.line_total)}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <hr className="border-charcoal/10 my-4" />

        <dl className="space-y-2">
          <div className="flex justify-between items-center">
            <dt className="font-body text-sm text-charcoal/70">Subtotal</dt>
            <dd className="font-heading text-sm text-forest">{naira(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between items-center">
              <dt className="font-body text-sm text-charcoal/70">Promo discount</dt>
              <dd className="font-heading text-sm text-forest">−{naira(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between items-center">
            <dt className="font-body text-sm text-charcoal/70">Delivery</dt>
            <dd className="font-heading text-sm text-forest">{order.shipping_cost === 0 ? 'Free' : naira(order.shipping_cost)}</dd>
          </div>
          <div className="flex justify-between items-center border-t border-charcoal/10 pt-2">
            <dt className="font-heading text-sm font-semibold text-forest">Total paid</dt>
            <dd className="font-heading text-base font-semibold text-forest">{naira(order.total)}</dd>
          </div>
        </dl>
      </div>

      {/* Delivery details */}
      <div className="mt-6 bg-stone/20 rounded-xl p-6">
        <h2 className="font-heading text-sm font-semibold text-forest uppercase tracking-wide mb-3">Delivering to</h2>
        <p className="font-body text-sm text-charcoal/70 leading-relaxed">
          {order.customer_name}
          <br />
          {order.delivery_address}
          <br />
          {order.delivery_state}
        </p>
        {order.status !== 'delivered' && (
          <p className="font-body text-sm text-charcoal/70 mt-3">
            <span className="font-semibold text-forest">Estimated delivery:</span> {order.delivery_estimate}. We&apos;ll WhatsApp you when it&apos;s on its way.
          </p>
        )}
      </div>

      {/* Contact support */}
      <div className="mt-6 p-5 bg-stone/20 rounded-xl text-center">
        <p className="font-heading text-sm font-semibold text-forest mb-1">Questions about your order?</p>
        <p className="font-body text-xs text-charcoal/60 mb-4">We&apos;re happy to help with tracking, changes, or anything else.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={BUSINESS.whatsapp.url(`Hi, I have a question about my order with reference ${order.reference}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center bg-gold text-forest font-heading font-semibold px-5 rounded-lg hover:bg-forest hover:text-cream transition-colors text-sm"
          >
            WhatsApp us
          </a>
          <a
            href={`mailto:${BUSINESS.support.email}?subject=${encodeURIComponent(`Order ${order.reference}`)}&body=${encodeURIComponent(`Hi, I have a question about my order with reference ${order.reference}.`)}`}
            className="inline-flex min-h-11 items-center border border-charcoal/30 text-charcoal font-heading font-semibold px-5 rounded-lg hover:border-forest hover:text-forest transition-colors text-sm"
          >
            Email us
          </a>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/catalog" className="font-heading font-semibold text-sm text-gold-deep underline underline-offset-2 hover:text-forest transition-colors">
          Continue shopping →
        </Link>
      </div>
    </div>
  );
}
