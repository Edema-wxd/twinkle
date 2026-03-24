'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/CartContext';
import { CartLineItem, lineKey } from '@/components/cart/CartLineItem';

export default function CartPage() {
  const { state, dispatch } = useCart();
  const { items } = state;

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  function handleUpdateQty(key: string, qty: number) {
    dispatch({ type: 'UPDATE_QTY', payload: { key, qty } });
  }

  function handleRemove(key: string) {
    dispatch({ type: 'REMOVE_ITEM', payload: { key } });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl text-cocoa mb-8">Your Cart</h1>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="font-body text-charcoal/60 text-lg mb-6">
            Your cart is empty.
          </p>
          <Link
            href="/catalog"
            className="font-heading font-semibold text-gold underline underline-offset-2 hover:text-terracotta transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        /* Cart with items */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column — line items */}
          <div className="md:col-span-2">
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

          {/* Right column — order summary */}
          <div className="md:col-span-1">
            <div className="bg-stone-50 rounded-xl p-6">
              <h2 className="font-heading text-lg text-cocoa mb-4">
                Order Summary
              </h2>

              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-charcoal">
                  Subtotal
                </span>
                <span className="font-heading font-semibold text-cocoa">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <p className="font-body text-xs text-charcoal/50 mt-1 mb-4">
                Shipping calculated at checkout
              </p>

              <hr className="border-charcoal/10 mb-4" />

              <div className="flex justify-between items-center mb-1">
                <span className="font-heading font-semibold text-cocoa text-base">
                  Total
                </span>
                <span className="font-heading font-semibold text-cocoa text-xl">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              <p className="font-body text-xs text-charcoal/40 mb-4">
                Taxes included where applicable
              </p>

              <Link
                href="/checkout"
                className="bg-gold text-cocoa font-heading font-semibold py-3 px-6 rounded-lg hover:bg-terracotta hover:text-cream transition-colors w-full text-center block mt-4"
              >
                Checkout
              </Link>

              <Link
                href="/catalog"
                className="text-sm text-charcoal/60 hover:text-cocoa underline text-center block mt-3"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
