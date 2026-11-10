'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCart } from '@/lib/cart/CartContext';
import { lineKey } from '@/lib/cart/cartReducer';
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

type LineCheck = { key: string; name: string; status: 'ok' | 'sold_out' | 'unavailable' };

export function OrderReview({ items, customerDetails, onBack, onPaymentSuccess }: OrderReviewProps) {
  const { dispatch } = useCart();
  // Server check of stock + current prices (same pricing the payment webhook uses)
  const [blockedLines, setBlockedLines] = useState<LineCheck[]>([]);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  /** Returns true when the bag can be paid for exactly as shown. */
  const checkCart = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/checkout/check-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          state: customerDetails.state,
          lga: customerDetails.lga,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        lines: { productId: string; variantId: string; tierQty: number; threadColour: string; status: LineCheck['status']; unitPrice: number | null }[];
      };
      setCheckFailed(false);

      const blocked: LineCheck[] = [];
      const reprice: Record<string, number> = {};
      const changed: string[] = [];
      data.lines.forEach((line, i) => {
        const item = items[i];
        if (!item) return;
        const key = lineKey(item);
        if (line.status !== 'ok') {
          blocked.push({ key, name: `${item.productName} ${item.variantName}`.trim(), status: line.status });
        } else if (typeof line.unitPrice === 'number' && line.unitPrice !== item.unitPrice) {
          reprice[key] = line.unitPrice;
          changed.push(item.productName);
        }
      });
      setBlockedLines(blocked);
      if (changed.length > 0) {
        dispatch({ type: 'REPRICE', payload: reprice });
        setPriceNotice(`We've updated the price of ${changed.join(', ')} to today's price. Please check your total.`);
      }
      return blocked.length === 0 && changed.length === 0;
    } catch {
      setCheckFailed(true);
      return false;
    }
  }, [items, customerDetails.state, customerDetails.lga, dispatch]);

  // Check when the review step opens and whenever the bag changes
  useEffect(() => {
    void checkCart();
  }, [checkCart]);

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

      {blockedLines.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-heading text-sm font-semibold text-red-800">
            {blockedLines.length === 1 ? 'One item' : `${blockedLines.length} items`} in your bag can&apos;t be bought right now
          </p>
          <ul className="mt-2 space-y-2">
            {blockedLines.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-3 font-body text-sm text-red-800">
                <span>
                  {l.name} <span className="text-red-700/80">({l.status === 'sold_out' ? 'sold out' : 'no longer available'})</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${l.name} from your order`}
                  onClick={() => {
                    dispatch({ type: 'REMOVE_ITEM', payload: { key: l.key } });
                    setBlockedLines((prev) => prev.filter((b) => b.key !== l.key));
                  }}
                  className="min-h-9 shrink-0 rounded-lg border border-red-300 bg-white px-3 font-heading text-xs font-semibold text-red-800 hover:bg-red-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {priceNotice && (
        <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 font-body text-sm text-amber-900">
          {priceNotice}
        </div>
      )}
      {checkFailed && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 font-body text-sm text-red-800 flex flex-wrap items-center justify-between gap-3">
          <span>We couldn&apos;t confirm stock for your bag.</span>
          <button type="button" onClick={() => void checkCart()} className="min-h-9 rounded-lg border border-red-300 bg-white px-3 font-heading text-xs font-semibold">
            Try again
          </button>
        </div>
      )}

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
            beforePay={async () => {
              // Re-check stock and prices the moment they tap Pay
              setPaymentError(null);
              const ok = await checkCart();
              if (!ok) setPaymentError('Your bag changed since you opened this page. Please review it above, then tap Pay again.');
              return ok;
            }}
            onClose={() => {
              setReference(newReference());
              setPaymentError('Payment was not completed. You have not been charged, tap Pay to try again.');
            }}
            disabled={shippingCost === null || promoLoading || blockedLines.length > 0 || checkFailed}
          />
        </div>
      </div>
    </div>
  );
}
