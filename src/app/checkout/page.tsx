'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart/CartContext';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import type { CustomerDetails } from '@/components/checkout/CheckoutForm';
import { OrderReview } from '@/components/checkout/OrderReview';
import { CheckoutBagSummary } from '@/components/checkout/CheckoutBagSummary';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);

  // Set once payment succeeds so clearing the cart doesn't bounce the customer to /cart
  const paidRef = useRef(false);

  // Redirect to cart if empty (only once the stored cart has been read)
  useEffect(() => {
    if (state.hydrated && state.items.length === 0 && !paidRef.current) {
      router.replace('/cart');
    }
  }, [state.hydrated, state.items.length, router]);

  function handleFormSubmit(details: CustomerDetails) {
    setCustomerDetails(details);
    setStep(2);
    // Fire-and-forget: save customer details as an abandoned order so we can
    // follow up if they don't complete payment.
    const subtotal = state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    fetch('/api/checkout/save-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `${details.firstName} ${details.lastName}`.trim(),
        customerEmail: details.email,
        customerPhone: details.phone,
        deliveryAddress: details.deliveryAddress,
        deliveryState: details.state,
        deliveryLGA: details.lga,
        cartItems: state.items.map(({ productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool }) => ({
          productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool,
        })),
        subtotal,
      }),
    }).catch(() => {
      // Silently ignore — this is best-effort, never block the user
    });
  }

  async function handlePaymentSuccess(reference: string) {
    // Best-effort server-side verification so orders are created/marked paid
    // even when Paystack can't deliver webhooks to localhost (dev) or when
    // the webhook is delayed.
    try {
      const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error('[checkout] Paystack verify failed', { reference, status: res.status, body })
      }
    } catch {
      // Ignore — webhook + order poller can still complete the flow.
    }

    paidRef.current = true;
    router.push('/orders/' + reference);
    dispatch({ type: 'CLEAR_CART' });
  }

  // Loading the saved cart, redirecting (empty cart) or heading to the order page
  if (!state.hydrated || state.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center" role="status">
        <p className="font-body text-charcoal/70">
          {!state.hydrated ? 'Loading your bag…' : paidRef.current ? 'Payment received, loading your order…' : 'Your bag is empty, taking you back…'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 font-heading text-sm font-semibold ${step === 1 ? 'text-gold' : 'text-charcoal/50'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-gold text-forest' : 'bg-charcoal/20 text-charcoal/50'}`}>
            1
          </span>
          Details
        </div>
        <div className="flex-1 h-px bg-charcoal/10" />
        <div className={`flex items-center gap-2 font-heading text-sm font-semibold ${step === 2 ? 'text-gold' : 'text-charcoal/50'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-gold text-forest' : 'bg-charcoal/20 text-charcoal/50'}`}>
            2
          </span>
          Review &amp; Pay
        </div>
      </div>

      {/* Step 1: what's in the bag, then customer details */}
      {step === 1 && (
        <>
          <CheckoutBagSummary items={state.items} />
          <CheckoutForm onSubmit={handleFormSubmit} defaultValues={customerDetails ?? undefined} />
        </>
      )}

      {/* Step 2: Order review + pay */}
      {step === 2 && customerDetails && (
        <OrderReview
          items={state.items}
          customerDetails={customerDetails}
          onBack={() => setStep(1)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
