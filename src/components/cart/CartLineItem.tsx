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
        alt=""
        width={64}
        height={64}
        className="w-16 h-16 object-contain rounded-md bg-stone-100 flex-shrink-0"
      />

      {/* Middle: info */}
      <div className="flex-1 ml-3 min-w-0">
        <p className="font-heading text-sm font-semibold text-forest leading-tight">
          {item.productName}
        </p>
        <p className="font-body text-xs text-charcoal/60 mt-0.5">
          {item.variantName}
          {item.tierQty > 1 && <> · Pack of {item.tierQty}</>}
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
        {/* Line total, with the unit price when there's more than one */}
        <p className="font-heading text-sm font-semibold text-forest mt-1">
          ₦{(item.unitPrice * item.quantity).toLocaleString('en-NG')}
        </p>
        {item.quantity > 1 && (
          <p className="font-body text-xs text-charcoal/60">₦{item.unitPrice.toLocaleString('en-NG')} each</p>
        )}
      </div>

      {/* Right: quantity controls + remove */}
      <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* At 1, "−" is disabled: taking the item out is the Remove button's job (and it can be undone) */}
          <button
            type="button"
            onClick={() => onUpdateQty(key, item.quantity - 1)}
            aria-label={`Decrease quantity of ${item.productName}`}
            disabled={item.quantity <= 1}
            className={`w-10 h-10 rounded-lg border border-charcoal/20 text-charcoal text-base font-body flex items-center justify-center hover:border-gold transition-colors ${
              item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            −
          </button>
          <span aria-live="polite" className="w-7 text-center font-body text-sm text-charcoal tabular-nums">
            <span className="sr-only">Quantity </span>
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(key, item.quantity + 1)}
            aria-label={`Increase quantity of ${item.productName}`}
            disabled={item.quantity >= 10}
            className={`w-10 h-10 rounded-lg border border-charcoal/20 text-charcoal text-base font-body flex items-center justify-center hover:border-gold transition-colors ${
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
          className="min-h-9 px-1 text-xs text-charcoal/70 underline underline-offset-2 hover:text-forest transition-colors font-body"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// Re-export lineKey for convenience so consumers can import from one place
export { lineKey };
