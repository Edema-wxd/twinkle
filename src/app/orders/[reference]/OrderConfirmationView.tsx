'use client';

import Link from 'next/link';
import { Order, OrderItem } from '@/types/db';
import { THREAD_COLOURS } from '@/lib/cart/threadColours';
import { BUSINESS } from '@/lib/config/business';

interface OrderConfirmationViewProps {
  order: Order & { order_items: OrderItem[] };
}

export function OrderConfirmationView({ order }: OrderConfirmationViewProps) {
  const threadColourMap = Object.fromEntries(
    THREAD_COLOURS.map((c) => [c.id, c])
  );

  const statusLabel =
    typeof order.status === 'string' && order.status.trim()
      ? order.status
      : 'processing';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-forest/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-forest"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-3xl text-cocoa text-center">
          Payment Successful
        </h1>
        <p className="font-body text-charcoal/60 text-center mt-2">
          Your order was accepted and is being processed.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-heading font-semibold text-cocoa">
            Status: {statusLabel}
          </span>
        </div>
        <p className="font-mono text-sm text-charcoal/50 text-center mt-1">
          Ref: {order.paystack_reference}
        </p>
      </div>

      {/* Order summary card */}
      <div className="bg-stone/30 rounded-xl p-6 mt-8">
        <h2 className="font-heading text-sm font-semibold text-cocoa uppercase tracking-wide mb-4">
          Your Items
        </h2>

        <div className="space-y-4">
          {order.order_items.map((item) => {
            const colour = item.thread_colour
              ? threadColourMap[item.thread_colour]
              : null;

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4"
              >
                {/* Left: item details */}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-semibold text-cocoa leading-snug">
                    {item.product_name}
                  </p>
                  <p className="font-body text-xs text-charcoal/60 mt-0.5">
                    {item.variant_name} · Pack of {item.tier_qty}
                    {colour && (
                      <>
                        {' '}
                        <span className="inline-flex items-center gap-1">
                          ·{' '}
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: colour.hex }}
                            aria-hidden="true"
                          />
                          {colour.label}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Right: qty + price */}
                <div className="flex-shrink-0 text-right">
                  <p className="font-heading text-sm text-charcoal/60">
                    ×{item.quantity}
                  </p>
                  <p className="font-heading text-sm font-semibold text-cocoa">
                    ₦{item.line_total.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <hr className="border-charcoal/10 my-4" />

        {/* Price rows */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-body text-sm text-charcoal/70">Subtotal</span>
            <span className="font-heading text-sm text-cocoa">
              ₦{order.subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-sm text-charcoal/70">Shipping</span>
            <span className="font-heading text-sm text-cocoa">
              {order.shipping_cost === 0
                ? 'Free'
                : `₦${order.shipping_cost.toLocaleString()}`}
            </span>
          </div>
          <hr className="border-charcoal/10" />
          <div className="flex justify-between items-center">
            <span className="font-heading text-sm font-semibold text-cocoa">
              Total
            </span>
            <span className="font-heading text-base font-semibold text-cocoa">
              ₦{order.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery details */}
      <div className="mt-6 bg-stone/20 rounded-xl p-6">
        <h2 className="font-heading text-sm font-semibold text-cocoa uppercase tracking-wide mb-3">
          Delivering To
        </h2>
        <p className="font-body text-sm text-charcoal/70 leading-relaxed">
          {order.customer_name}
          <br />
          {order.delivery_address}
          <br />
          {order.delivery_state}
        </p>
      </div>

      {/* Estimated delivery */}
      <p className="font-body text-sm text-charcoal/60 text-center mt-6">
        Estimated delivery: 3–5 business days (Lagos) or 5–7 business days
        (other states).
      </p>

      {/* Contact support */}
      <div className="mt-6 p-5 bg-stone/20 rounded-xl text-center">
        <p className="font-heading text-sm font-semibold text-cocoa mb-1">Questions about your order?</p>
        <p className="font-body text-xs text-charcoal/60 mb-4">
          We&apos;re happy to help with tracking, changes, or anything else.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={BUSINESS.whatsapp.url(`Hi, I have a question about my order with reference ${order.paystack_reference}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-cocoa font-heading font-semibold py-2.5 px-5 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
          >
            WhatsApp Us
          </a>
          <a
            href={`mailto:${BUSINESS.support.email}?subject=Order%20${encodeURIComponent(order.paystack_reference)}&body=Hi%2C%20I%20have%20a%20question%20about%20my%20order%20with%20reference%20${encodeURIComponent(order.paystack_reference)}.`}
            className="inline-block border border-charcoal/30 text-charcoal font-heading font-semibold py-2.5 px-5 rounded-lg hover:border-cocoa hover:text-cocoa transition-colors text-sm"
          >
            Email Us
          </a>
        </div>
      </div>

      {/* Continue shopping */}
      <div className="text-center mt-6">
        <Link
          href="/catalog"
          className="font-heading font-semibold text-sm text-gold underline underline-offset-2 hover:text-terracotta transition-colors"
        >
          Continue Shopping →
        </Link>
      </div>
    </div>
  );
}
