'use client';

import { useEffect } from 'react';
import type { PublicOrder } from '@/lib/orders/publicOrder';
import { useConsentStatus } from '@/lib/tracking/consent';
import { trackEvent, type PurchaseContent, type TrackEvent } from '@/lib/tracking/events';

/** Meta and TikTok drop a repeated event id for about 48 hours; past that, don't send at all */
const SEND_WITHIN_MS = 48 * 60 * 60 * 1000;
const storageKey = (reference: string) => `tl_purchase_sent:${reference}`;

/** The browser Purchase for an order (pure, for tests). Content ids are product ids, as on every other event. */
export function purchaseEventFor(order: PublicOrder): Extract<TrackEvent, { name: 'Purchase' }> {
  const byId = new Map<string, { quantity: number; total: number }>();
  for (const item of order.items) {
    const entry = byId.get(item.product_id) ?? { quantity: 0, total: 0 };
    entry.quantity += item.quantity;
    entry.total += item.line_total;
    byId.set(item.product_id, entry);
  }
  const contents: PurchaseContent[] = [...byId].map(([id, e]) => ({
    id,
    quantity: e.quantity,
    price: e.quantity > 0 ? Math.round((e.total / e.quantity) * 100) / 100 : undefined,
  }));
  return {
    name: 'Purchase',
    contentIds: contents.map((c) => c.id),
    contents,
    value: order.total,
    numItems: contents.reduce((s, c) => s + c.quantity, 0),
    orderId: order.reference,
  };
}

/**
 * Fires the browser Purchase once, when the order is confirmed paid. The event
 * id is the Paystack reference, the same as the server-side Purchase, so the
 * ad platforms count it once. A localStorage flag stops a refresh (or a later
 * visit to check delivery) from sending it again. Waits for consent: if the
 * buyer accepts on this page, it fires then.
 */
export function PurchaseTracker({ order }: { order: PublicOrder }) {
  const consent = useConsentStatus();

  useEffect(() => {
    if (consent !== 'granted' || order.status !== 'paid') return;
    if (!(Date.now() - Date.parse(order.created_at) < SEND_WITHIN_MS)) return;
    const key = storageKey(order.reference);
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* storage blocked: a repeat is still dropped by the shared event id */
    }
    trackEvent(purchaseEventFor(order), { eventId: order.reference });
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* storage blocked */
    }
  }, [consent, order]);

  return null;
}
