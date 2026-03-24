'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderItem } from '@/types/supabase';
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

  useEffect(() => {
    const supabase = createClient();

    // 30-second timeout
    timeoutRef.current = setTimeout(() => setTimedOut(true), 30_000);

    // Helper to fetch full order with items
    async function fetchFullOrder() {
      const result = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('paystack_reference', reference)
        .single();
      if (!result.error && result.data) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOrder(result.data as unknown as FullOrder);
        return true;
      }
      return false;
    }

    // Immediate fetch to cover the race where webhook already arrived
    fetchFullOrder();

    // Realtime subscription for when webhook arrives after page load
    const channel = supabase
      .channel('order-' + reference)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'paystack_reference=eq.' + reference,
        },
        async () => {
          // Realtime payload may not include order_items relation — do a full fetch
          await fetchFullOrder();
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
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
        <div className="mt-6">
          <a
            href={BUSINESS.whatsapp.url(`Hi, I just placed an order with reference ${reference} and need help confirming it.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gold text-cocoa font-heading font-semibold py-3 px-6 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
          >
            Contact Us on WhatsApp
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
      <p className="font-body text-charcoal/60">Processing your order...</p>
    </div>
  );
}
