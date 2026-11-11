'use client';

import { useEffect, useRef } from 'react';
import type { CartItem } from '@/lib/cart/types';

/** "Removed X. Undo" shown after a cart line is removed. Focus moves to Undo so keyboard users can act straight away. */
export function UndoRemoveBar({ item, onUndo, onDismiss }: { item: CartItem | null; onUndo: () => void; onDismiss: () => void }) {
  const undoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (item) undoRef.current?.focus();
  }, [item]);

  return (
    <div role="status" aria-live="polite">
      {item && (
        <div className="my-3 flex items-center justify-between gap-3 rounded-lg bg-forest px-4 py-2.5 font-body text-sm text-cream">
          <span className="min-w-0 truncate">
            Removed {item.productName}
            {item.variantName ? ` ${item.variantName}` : ''}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              ref={undoRef}
              type="button"
              onClick={onUndo}
              className="min-h-9 rounded-md px-3 font-heading text-sm font-semibold text-gold-light underline underline-offset-2 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="flex h-9 w-9 items-center justify-center rounded-md text-cream/70 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
