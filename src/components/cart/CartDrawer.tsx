'use client';

import { useEffect, useRef } from 'react';
import { useDialogFocus } from '@/lib/useDialogFocus';
import Link from 'next/link';
import { useCart } from '@/lib/cart/CartContext';
import { lineKey } from '@/lib/cart/cartReducer';
import { CartLineItem } from './CartLineItem';
import { UndoRemoveBar } from './UndoRemoveBar';
import { useRemoveWithUndo } from '@/lib/cart/useRemoveWithUndo';

export function CartDrawer() {
  const { state, dispatch } = useCart();
  const { items, isDrawerOpen: isOpen } = state;
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, isOpen);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dispatch({ type: 'CLOSE_DRAWER' });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleUpdateQty(key: string, qty: number) {
    dispatch({ type: 'UPDATE_QTY', payload: { key, qty } });
  }

  // Remove with a few seconds to undo
  const { removed, remove: handleRemove, undo, dismiss } = useRemoveWithUndo();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-forest/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel — slides in from the right */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        inert={!isOpen}
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-cream shadow-2xl flex flex-col z-[61] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-charcoal/10">
          <h2 className="font-display text-xl text-forest">
            Your Cart
            {totalItems > 0 && (
              <span className="ml-2 font-body text-sm text-charcoal/50 font-normal">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
            aria-label="Close cart"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-charcoal/70 hover:text-forest text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable items area */}
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-full">
                <UndoRemoveBar item={removed} onUndo={undo} onDismiss={dismiss} />
              </div>
              {/* Simple bag illustration */}
              <svg
                viewBox="0 0 64 64"
                className="w-16 h-16 text-charcoal/20 mb-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 24V18a12 12 0 0124 0v6M16 24h32l-4 28H20L16 24z"
                />
                <circle cx="26" cy="36" r="2" fill="currentColor" stroke="none" />
                <circle cx="38" cy="36" r="2" fill="currentColor" stroke="none" />
              </svg>
              <p className="font-body text-charcoal/60 mb-4">Your cart is empty</p>
              <Link
                href="/catalog"
                onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
                className="font-heading text-sm font-semibold text-gold underline hover:text-forest transition-colors"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            /* Line items */
            <div className="py-2">
            <UndoRemoveBar item={removed} onUndo={undo} onDismiss={dismiss} />
              {items.map((item) => {
                const key = lineKey(item);
                return (
                  <CartLineItem
                    key={key}
                    item={item}
                    lineKey={key}
                    onUpdateQty={handleUpdateQty}
                    onRemove={handleRemove}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="border-t border-charcoal/10 p-4 bg-cream">
          {/* Subtotal */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-heading text-sm font-semibold text-forest">Subtotal</span>
            <span className="font-heading text-sm font-semibold text-forest">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>
          <p className="font-body text-xs text-charcoal/50 mb-4">
            Shipping calculated at checkout
          </p>

          {/* Checkout CTA */}
          {items.length > 0 ? (
            <Link
              href="/checkout"
              onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
              className="bg-gold text-forest font-heading font-semibold py-3 rounded-lg hover:bg-forest hover:text-cream transition-colors w-full text-center block"
            >
              Checkout
            </Link>
          ) : (
            <div
              aria-hidden="true"
              className="bg-charcoal/10 text-charcoal/30 font-heading font-semibold py-3 rounded-lg w-full text-center pointer-events-none select-none"
            >
              Checkout
            </div>
          )}
        </div>
      </div>
    </>
  );
}
