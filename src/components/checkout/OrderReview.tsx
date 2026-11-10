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
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: 'free_shipping' | 'percentage' | 'fixed';
    discountAmount: number;
    shippingSaving: number;
    message: string;
  } | null>(null);

  const zone =
    customerDetails.state === 'Lagos' && customerDetails.lga
      ? getZoneById(getZoneIdForArea(customerDetails.lga) ?? 0)
      : undefined;

  async function applyPromo() {
    if (!promoInput.trim() || shippingCost === null) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), subtotal, shippingCost }),
      });
      const data = await res.json() as {
        valid: boolean;
        error?: string;
        discountType?: 'free_shipping' | 'percentage' | 'fixed';
        discountAmount?: number;
        shippingSaving?: number;
        message?: string;
      };
      if (!data.valid) {
        setPromoError(data.error ?? 'Invalid promo code');
        setAppliedPromo(null);
      } else {
        setAppliedPromo({
          code: promoInput.trim().toUpperCase(),
          discountType: data.discountType!,
          discountAmount: data.discountAmount!,
          shippingSaving: data.shippingSaving!,
          message: data.message!,
        });
        setPromoError(null);
      }
    } catch {
      setPromoError('Could not validate promo code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  }

  const [shippingAttempt, setShippingAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setShippingCost(null);
    setShippingError(null);

    const params = new URLSearchParams({ state: customerDetails.state });
    if (customerDetails.lga) params.set('lga', customerDetails.lga);

    fetch(`/api/checkout/shipping-cost?${params.toString()}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { cost?: unknown; deliveryTime?: unknown; error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? `Failed to fetch shipping (${res.status})`);
        if (typeof data?.cost !== 'number') throw new Error('Invalid shipping response');
        if (!cancelled) {
          setShippingCost(data.cost);
          setDeliveryTime(typeof data.deliveryTime === 'string' ? data.deliveryTime : null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          // Leave cost null so Pay stays disabled; never charge ₦0 shipping by accident
          setShippingError('We couldn\'t load the delivery fee for your area.');
          console.error('[checkout] Failed to fetch shipping cost', e);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerDetails.state, customerDetails.lga, shippingAttempt]);

  const effectiveShipping = appliedPromo?.discountType === 'free_shipping' ? 0 : (shippingCost ?? 0);
  const subtotalDiscount = appliedPromo?.discountType !== 'free_shipping' ? (appliedPromo?.discountAmount ?? 0) : 0;
  const total = subtotal - subtotalDiscount + effectiveShipping;
  const totalKobo = total * 100;

  // Paystack rejects a reused reference, so mint a fresh one after each closed popup
  const newReference = () => 'tw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const [reference, setReference] = useState(newReference);

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
    shipping_cost: effectiveShipping,
    promo_code: appliedPromo?.code ?? null,
    discount_amount: subtotalDiscount,
    discount_type: appliedPromo?.discountType ?? null,
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

      {/* Promo code */}
      <div className="mb-4">
        {appliedPromo ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span className="font-body text-sm text-green-700">{appliedPromo.message}</span>
            <button
              onClick={removePromo}
              className="font-body text-xs text-green-600 underline ml-3 shrink-0"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
              placeholder="Promo code"
              className="flex-1 border border-charcoal/20 rounded-lg px-3 py-2 font-body text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-forest uppercase"
            />
            <button
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim() || shippingCost === null}
              className="px-4 py-2 bg-forest text-cream font-heading text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-forest/90 transition-colors"
            >
              {promoLoading ? '…' : 'Apply'}
            </button>
          </div>
        )}
        {promoError && (
          <p className="font-body text-xs text-red-500 mt-1.5">{promoError}</p>
        )}
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
            {shippingCost === null
              ? (shippingError ? 'Unavailable' : 'Loading…')
              : appliedPromo?.discountType === 'free_shipping'
                ? <><s className="text-charcoal/40">₦{shippingCost.toLocaleString()}</s> <span className="text-green-600 font-semibold">FREE</span></>
                : `₦${shippingCost.toLocaleString()}`}
          </span>
        </div>
        {subtotalDiscount > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="font-body text-sm text-green-600">Discount ({appliedPromo?.code})</span>
            <span className="font-body text-sm text-green-600">−₦{subtotalDiscount.toLocaleString()}</span>
          </div>
        )}
        {(deliveryTime ?? zone?.deliveryTime) && (
          <p className="font-body text-xs text-charcoal/70 mb-2">
            Est. delivery: {deliveryTime ?? zone?.deliveryTime} after dispatch
            {customerDetails.state !== 'Lagos' && ' by courier. We\'ll WhatsApp you the tracking details.'}
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
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-sm text-red-700">{paymentError ?? shippingError}</p>
          {shippingError && !paymentError && (
            <button
              type="button"
              onClick={() => setShippingAttempt((n) => n + 1)}
              className="min-h-10 px-4 rounded-lg bg-white border border-red-300 font-heading text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
          )}
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
            onClose={() => {
              setReference(newReference());
              setPaymentError('Payment was not completed. You have not been charged, tap Pay to try again.');
            }}
            disabled={shippingCost === null || promoLoading}
          />
        </div>
      </div>
    </div>
  );
}
