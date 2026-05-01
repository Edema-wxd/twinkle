'use client';

import { useEffect, useRef, useState } from 'react';
import { Order, OrderItem } from '@/types/db';
import { OrderConfirmationView } from './OrderConfirmationView';
import { BUSINESS } from '@/lib/config/business';

interface OrderPollerProps {
  reference: string;
}

type FullOrder = Order & { order_items: OrderItem[] };

export function OrderPoller({ reference }: OrderPollerProps) {
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // 30-second timeout
    timeoutRef.current = setTimeout(() => setTimedOut(true), 30_000);

    // Helper to fetch full order via API route (uses service-role key server-side,
    // avoids RLS blocking anon reads on the orders table)
    async function fetchFullOrder() {
      try {
        const res = await fetch(`/api/orders/${reference}`);
        if (res.ok) {
          const data = await res.json();
          if (data && !cancelled) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOrder(data as FullOrder);
            return true;
          }
        }
      } catch {
        // Network error — will retry on next interval
      }
      return false;
    }

    // One-time fallback: if the order doesn't exist yet, ask the server to verify
    // the Paystack reference (creates/marks the order paid). This covers cases where
    // webhooks are delayed/missed and the checkout success handler didn't complete.
    async function verifyPaystackOnce() {
      if (verifyAttemptedRef.current) return;
      verifyAttemptedRef.current = true;
      try {
        await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      } catch {
        // Ignore — we'll keep polling; user can still contact support on timeout.
      }
    }

    // Immediate fetch to cover the race where webhook already arrived
    fetchFullOrder().then((found) => {
      if (found || cancelled) return;
      verifyPaystackOnce();
      // Poll every 2 seconds until order appears or timeout fires
      const intervalId = setInterval(async () => {
        const found = await fetchFullOrder();
        if (found || cancelled) clearInterval(intervalId);
      }, 2_000);
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalId);
        if (!cancelled) setTimedOut(true);
      }, 30_000);
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reference]);

  if (order) {
    return <OrderConfirmationView order={order} />;
  }

  if (timedOut) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-terracotta/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-terracotta"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-cocoa">Still Processing</h1>
        <p className="font-body text-charcoal/70 mt-4 max-w-md mx-auto">
          Your payment was received but we&apos;re still processing your order.
          Please contact us with your reference number and we&apos;ll confirm
          your order status.
        </p>
        <p className="font-mono text-sm text-charcoal/50 mt-3">
          Ref: {reference}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={BUSINESS.whatsapp.url(`Hi, I just placed an order with reference ${reference} and need help confirming it.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-cocoa font-heading font-semibold py-3 px-6 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
          >
            Contact Us on WhatsApp
          </a>
          <a
            href={`mailto:${BUSINESS.support.email}?subject=Order%20${encodeURIComponent(reference)}%20-%20Still%20Processing&body=Hi%2C%20I%20placed%20an%20order%20with%20reference%20${encodeURIComponent(reference)}%20and%20it%20is%20still%20showing%20as%20processing.%20Please%20help%20confirm%20my%20order%20status.`}
            className="inline-block border border-charcoal/30 text-charcoal font-heading font-semibold py-3 px-6 rounded-lg hover:border-cocoa hover:text-cocoa transition-colors text-sm"
          >
            Email Us
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-4">
      <div
        className="w-10 h-10 rounded-full border-4 border-gold border-t-transparent animate-spin"
        aria-hidden="true"
      />
      <div className="text-center">
        <p className="font-body text-charcoal/70">Payment successful.</p>
        <p className="font-body text-charcoal/60 mt-1">
          We&apos;re confirming your order. This usually takes a few seconds.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <a
          href={BUSINESS.whatsapp.url(`Hi, I just paid for an order (ref: ${reference}) and I'm waiting for confirmation.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-gold text-cocoa font-heading font-semibold py-2.5 px-5 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
        >
          WhatsApp Us
        </a>
        <a
          href={`mailto:${BUSINESS.support.email}?subject=Order%20${encodeURIComponent(reference)}&body=Hi%2C%20I%20just%20paid%20for%20an%20order%20with%20reference%20${encodeURIComponent(reference)}%20and%20I%20am%20waiting%20for%20confirmation.`}
          className="inline-block border border-charcoal/30 text-charcoal font-heading font-semibold py-2.5 px-5 rounded-lg hover:border-cocoa hover:text-cocoa transition-colors text-sm"
        >
          Email Us
        </a>
      </div>
    </div>
  );
}
