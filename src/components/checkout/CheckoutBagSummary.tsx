'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CartItem } from '@/lib/cart/types';
import { lineKey } from '@/lib/cart/cartReducer';

/**
 * Step 1 of checkout: a collapsible "what you're buying" summary, so customers
 * can see their bag and subtotal while filling in delivery details. Delivery
 * is priced on the next step, once we know where it's going.
 */
export function CheckoutBagSummary({ items }: { items: CartItem[] }) {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <details className="group max-w-lg mx-auto mb-8 rounded-xl bg-white ring-1 ring-charcoal/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-body text-sm text-charcoal [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-heading font-semibold text-forest">Your bag</span>
          <span className="text-charcoal/60"> · {count} {count === 1 ? 'item' : 'items'}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-heading font-semibold text-forest">₦{subtotal.toLocaleString('en-NG')}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-charcoal/50 transition-transform group-open:rotate-180" fill="currentColor">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-charcoal/10 px-4 py-3">
        <ul className="divide-y divide-charcoal/10">
          {items.map((item) => {
            const detail = [item.variantName, item.tierQty > 1 ? `Pack of ${item.tierQty}` : null, !item.isTool && item.threadColour ? item.threadColour : null]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={lineKey(item)} className="flex items-center gap-3 py-2">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                  <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1 font-body text-sm">
                  <p className="truncate text-charcoal">{item.productName}</p>
                  <p className="truncate text-xs text-charcoal/60">
                    {detail}
                    {item.quantity > 1 ? ` · × ${item.quantity}` : ''}
                  </p>
                </div>
                <span className="font-body text-sm text-charcoal whitespace-nowrap">₦{(item.unitPrice * item.quantity).toLocaleString('en-NG')}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 font-body text-xs text-charcoal/60">
          Delivery is worked out on the next step.{' '}
          <Link href="/cart" className="underline underline-offset-2 hover:text-forest">
            Edit bag
          </Link>
        </p>
      </div>
    </details>
  );
}
