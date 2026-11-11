'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicOrder } from '@/lib/orders/publicOrder';
import { OrderConfirmationView } from './OrderConfirmationView';
import { BUSINESS } from '@/lib/config/business';

interface OrderPollerProps {
  reference: string;
}

/**
 * Shown when the customer lands here before the payment webhook has recorded
 * the order. Nothing is claimed until the order exists:
 *  - checking (first 30s): poll every 2s, and ask the server once to verify with Paystack
 *  - slow (up to 5 min): keep polling every 8s, explain it's taking longer
 *  - stuck (after 5 min): stop polling and offer WhatsApp / email with the reference
 */
type Phase = 'checking' | 'slow' | 'stuck';

const FAST_MS = 2_000;
const SLOW_MS = 8_000;
const SLOW_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 5 * 60_000;

export function OrderPoller({ reference }: OrderPollerProps) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let verifyAsked = false;

    async function fetchOrder(): Promise<boolean> {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(reference)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as PublicOrder | null;
          if (data && !cancelled) {
            setOrder(data);
            return true;
          }
        }
      } catch {
        // Network blip: try again on the next tick
      }
      return false;
    }

    // Fallback if the webhook is delayed or missed: ask the server to check with Paystack once
    function verifyOnce() {
      if (verifyAsked) return;
      verifyAsked = true;
      fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`, { headers: { Accept: 'application/json' } }).catch(() => {});
    }

    async function tick() {
      if (cancelled) return;
      if (await fetchOrder()) return;
      verifyOnce();
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= GIVE_UP_AFTER_MS) {
        setPhase('stuck');
        return;
      }
      if (elapsed >= SLOW_AFTER_MS) setPhase('slow');
      timer = setTimeout(tick, elapsed >= SLOW_AFTER_MS ? SLOW_MS : FAST_MS);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reference]);

  if (order) return <OrderConfirmationView order={order} />;

  const whatsapp = BUSINESS.whatsapp.url(`Hi, I just paid for an order (reference ${reference}) and I'm waiting for it to be confirmed.`);
  const email = `mailto:${BUSINESS.support.email}?subject=${encodeURIComponent(`Order ${reference}`)}&body=${encodeURIComponent(
    `Hi, I paid for an order with reference ${reference} and it hasn't been confirmed yet. Please could you check it?`,
  )}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
      {phase !== 'stuck' ? (
        <div className="w-10 h-10 rounded-full border-4 border-gold border-t-transparent animate-spin" aria-hidden="true" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center" aria-hidden="true">
          <svg className="w-7 h-7 text-gold-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </div>
      )}

      {/* Announced to screen readers as the phase changes */}
      <div role="status" aria-live="polite">
        <h1 className="font-display text-3xl text-forest">
          {phase === 'checking' ? 'Confirming your payment…' : phase === 'slow' ? 'Still confirming…' : 'We’re still checking your payment'}
        </h1>
        <p className="font-body text-charcoal/70 mt-3">
          {phase === 'checking'
            ? 'This usually takes a few seconds. Please keep this page open.'
            : phase === 'slow'
              ? 'This is taking longer than usual. If money has left your account, your order is safe and we’ll confirm it by email. You can keep this page open.'
              : 'We couldn’t confirm your payment automatically. If money has left your account, your order is safe: message us with your reference and we’ll confirm it for you. Please don’t pay again.'}
        </p>
      </div>

      <p className="font-mono text-sm text-charcoal/50">Order reference: {reference}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center bg-gold text-forest font-heading font-semibold px-5 rounded-lg hover:bg-forest hover:text-cream transition-colors text-sm"
        >
          WhatsApp us
        </a>
        <a
          href={email}
          className="inline-flex min-h-11 items-center border border-charcoal/30 text-charcoal font-heading font-semibold px-5 rounded-lg hover:border-forest hover:text-forest transition-colors text-sm"
        >
          Email us
        </a>
      </div>
    </div>
  );
}
