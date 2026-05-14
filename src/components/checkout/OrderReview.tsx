'use client';

import { useEffect, useState } from 'react';
import type { CartItem } from '@/lib/cart/types';
import type { CustomerDetails } from './CheckoutForm';
import { PaystackButton } from './PaystackButton';
import { getZoneIdForArea, getZoneById } from '@/lib/checkout/shippingZones';

interface OrderReviewProps {
  items: CartItem[];
  customerDetails: CustomerDetails;
  onBack: () => void;
  onPaymentSuccess: (reference: string) => void;
}

export function OrderReview({ items, customerDetails, onBack, onPaymentSuccess }: OrderReviewProps) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const zone =
    customerDetails.state === 'Lagos' && customerDetails.lga
      ? getZoneById(getZoneIdForArea(customerDetails.lga) ?? 0)
      : undefined;

  useEffect(() => {
    let cancelled = false;
    setShippingCost(null);
    setShippingError(null);

    const params = new URLSearchParams({ state: customerDetails.state });
    if (customerDetails.lga) params.set('lga', customerDetails.lga);

    fetch(`/api/checkout/shipping-cost?${params.toString()}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { cost?: unknown; error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? `Failed to fetch shipping (${res.status})`);
        if (typeof data?.cost !== 'number') throw new Error('Invalid shipping response');
        if (!cancelled) setShippingCost(data.cost);
      })
      .catch((e) => {
        if (!cancelled) {
          setShippingError('Could not load shipping rate. Please refresh and try again.');
          setShippingCost(0);
          console.error('[checkout] Failed to fetch shipping cost', e);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerDetails.state, customerDetails.lga]);

  const total = subtotal + (shippingCost ?? 0);
  const totalKobo = total * 100;

  const [reference] = useState(
    () => 'tw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  );

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const shippingLabel =
    zone
      ? `${customerDetails.lga} (Zone ${zone.id} — ${zone.name})`
      : customerDetails.state;

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
      lga: customerDetails.lga,
    },
    subtotal,
    shipping_cost: shippingCost ?? 0,
    custom_fields: [
      {
        display_name: 'Customer Name',
        variable_name: 'customer_name',
        value: `${customerDetails.firstName} ${customerDetails.lastName}`.trim(),
      },
      {
        display_name: 'Phone Number',
        variable_name: 'phone_number',
        value: customerDetails.phone,
      },
    ],
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-display text-2xl text-forest mb-6">Review Your Order</h2>

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
            Shipping ({shippingLabel})
          </span>
          <span className="font-body text-sm text-charcoal">
            {shippingCost === null ? 'Loading…' : `₦${shippingCost.toLocaleString()}`}
          </span>
        </div>
        {zone && (
          <p className="font-body text-xs text-charcoal/50 mb-2">
            Est. delivery: {zone.deliveryTime}
          </p>
        )}
        {!zone && customerDetails.state !== 'Lagos' && (
          <p className="font-body text-xs text-charcoal/50 mb-2">
            Delivery outside Lagos — our team will confirm details with you after your order.
          </p>
        )}
        <hr className="border-charcoal/10 my-3" />
        <div className="flex justify-between items-center">
          <span className="font-heading font-semibold text-forest">Total</span>
          <span className="font-heading font-semibold text-xl text-forest">
            ₦{total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Customer details summary */}
      <div className="mb-4 p-4 border border-charcoal/10 rounded-xl">
        <h3 className="font-heading text-sm text-forest mb-2">Delivery Details</h3>
        <div className="font-body text-sm text-charcoal/70 space-y-1">
          <p>{customerDetails.firstName} {customerDetails.lastName}</p>
          <p>{customerDetails.email}</p>
          <p>{customerDetails.phone}</p>
          <p>{customerDetails.deliveryAddress}</p>
          <p>{customerDetails.lga ? `${customerDetails.lga}, ${customerDetails.state}` : customerDetails.state}</p>
        </div>
      </div>

      {/* Payment error banner */}
      {(paymentError || shippingError) && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-body text-sm text-red-600">{paymentError ?? shippingError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 border border-charcoal/30 text-charcoal font-heading font-semibold py-4 rounded-lg hover:border-forest hover:text-forest transition-colors"
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
            disabled={shippingCost === null}
          />
        </div>
      </div>
    </div>
  );
}
