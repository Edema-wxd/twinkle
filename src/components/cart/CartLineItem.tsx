'use client';

import Image from 'next/image';
import { CartItem } from '@/lib/cart/types';
import { THREAD_COLOURS } from '@/lib/cart/threadColours';
import { lineKey } from '@/lib/cart/cartReducer';

interface CartLineItemProps {
  item: CartItem;
  lineKey: string;
  onUpdateQty: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}

export function CartLineItem({ item, lineKey: key, onUpdateQty, onRemove }: CartLineItemProps) {
  const threadColour = !item.isTool
    ? THREAD_COLOURS.find((c) => c.id === item.threadColour)
    : null;

  return (
    <div className="flex items-start py-3 border-b border-charcoal/10 last:border-b-0">
      {/* Thumbnail */}
      <Image
        src={item.imageUrl}
        alt={item.productName}
        width={64}
        height={64}
        className="w-16 h-16 object-contain rounded-md bg-stone-100 flex-shrink-0"
      />

      {/* Middle: info */}
      <div className="flex-1 ml-3 min-w-0">
        <p className="font-heading text-sm font-semibold text-cocoa leading-tight">
          {item.productName}
        </p>
        <p className="font-body text-xs text-charcoal/60 mt-0.5">
          {item.variantName} · Pack of {item.tierQty}
        </p>
        {!item.isTool && threadColour && (
          <p className="font-body text-xs text-charcoal/60 flex items-center gap-1.5 mt-0.5">
            <span
              className="w-3 h-3 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: threadColour.hex }}
              aria-hidden="true"
            />
            {threadColour.label}
          </p>
        )}
        <p className="font-heading text-sm font-semibold text-gold mt-1">
          ₦{item.unitPrice.toLocaleString()}
        </p>
      </div>

      {/* Right: quantity controls + remove */}
      <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdateQty(key, item.quantity - 1)}
            aria-label="Decrease quantity"
            className="w-6 h-6 rounded border border-charcoal/20 text-charcoal text-sm font-body flex items-center justify-center hover:border-gold transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center font-body text-sm text-charcoal">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(key, item.quantity + 1)}
            aria-label="Increase quantity"
            disabled={item.quantity >= 10}
            className={`w-6 h-6 rounded border border-charcoal/20 text-charcoal text-sm font-body flex items-center justify-center hover:border-gold transition-colors ${
              item.quantity >= 10 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRemove(key)}
          aria-label={`Remove ${item.productName} from cart`}
          className="text-xs text-charcoal/40 hover:text-terracotta transition-colors font-body"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// Re-export lineKey for convenience so consumers can import from one place
export { lineKey };
