'use client';

import { useState } from 'react';
import type { CartItem } from '@/lib/cart/types';
import type { CustomerDetails } from './CheckoutForm';
import { getShippingCost } from '@/lib/checkout/shipping';
import { PaystackButton } from './PaystackButton';

interface OrderReviewProps {
  items: CartItem[];
  customerDetails: CustomerDetails;
  onBack: () => void;
  onPaymentSuccess: (reference: string) => void;
}

export function OrderReview({ items, customerDetails, onBack, onPaymentSuccess }: OrderReviewProps) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingCost = getShippingCost(customerDetails.state);
  const total = subtotal + shippingCost;
  const totalKobo = total * 100;

  // Generate a stable reference once on mount
  const [reference] = useState(
    () => 'TW-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()
  );

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const metadata = {
    cart_items: items.map(({ productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool }) => ({
      productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool,
    })),
    customer_details: {
      first_name: customerDetails.firstName,
      last_name: customerDetails.lastName,
      phone: customerDetails.phone,
      delivery_address: customerDetails.deliveryAddress,
      state: customerDetails.state,
    },
    subtotal,
    shipping_cost: shippingCost,
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-display text-2xl text-cocoa mb-6">Review Your Order</h2>

      {/* Line items */}
      <div className="mb-4">
        {items.map((item) => {
          const lineTotal = item.unitPrice * item.quantity;
          const label = [
            item.productName,
            item.variantName,
            item.tierQty > 1 ? `Pack of ${item.tierQty}` : null,
            !item.isTool && item.threadColour ? item.threadColour : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div
              key={`${item.productId}-${item.variantId}-${item.tierQty}-${item.threadColour}`}
              className="flex justify-between items-start py-2 border-b border-charcoal/10"
            >
              <div className="font-body text-sm text-charcoal pr-4">
                <span>{label}</span>
                <span className="text-charcoal/50 ml-2">× {item.quantity}</span>
              </div>
              <span className="font-body text-sm text-charcoal whitespace-nowrap">
                ₦{lineTotal.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Price breakdown */}
      <div className="bg-stone-50 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-body text-sm text-charcoal">Subtotal</span>
          <span className="font-body text-sm text-charcoal">₦{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="font-body text-sm text-charcoal">
            Shipping ({customerDetails.state})
          </span>
          <span className="font-body text-sm text-charcoal">₦{shippingCost.toLocaleString()}</span>
        </div>
        <hr className="border-charcoal/10 my-3" />
        <div className="flex justify-between items-center">
          <span className="font-heading font-semibold text-cocoa">Total</span>
          <span className="font-heading font-semibold text-xl text-cocoa">
            ₦{total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Customer details summary */}
      <div className="mb-4 p-4 border border-charcoal/10 rounded-xl">
        <h3 className="font-heading text-sm text-cocoa mb-2">Delivery Details</h3>
        <div className="font-body text-sm text-charcoal/70 space-y-1">
          <p>{customerDetails.firstName} {customerDetails.lastName}</p>
          <p>{customerDetails.email}</p>
          <p>{customerDetails.phone}</p>
          <p>{customerDetails.deliveryAddress}</p>
          <p>{customerDetails.state}</p>
        </div>
      </div>

      {/* Payment error banner */}
      {paymentError && (
        <div className="mb-4 p-4 bg-terracotta/10 border border-terracotta/30 rounded-lg">
          <p className="font-body text-sm text-terracotta">{paymentError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 border border-charcoal/30 text-charcoal font-heading font-semibold py-4 rounded-lg hover:border-cocoa hover:text-cocoa transition-colors"
        >
          Back
        </button>
        <div className="flex-1">
          <PaystackButton
            config={{
              email: customerDetails.email,
              amountKobo: totalKobo,
              reference,
              metadata,
            }}
            onSuccess={onPaymentSuccess}
            onClose={() => setPaymentError('Payment was not completed — please try again.')}
          />
        </div>
      </div>
    </div>
  );
}
