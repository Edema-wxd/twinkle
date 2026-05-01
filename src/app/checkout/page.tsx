'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart/CartContext';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import type { CustomerDetails } from '@/components/checkout/CheckoutForm';
import { OrderReview } from '@/components/checkout/OrderReview';
import { BUSINESS } from '@/lib/config/business';
import Link from 'next/link';

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [isInternational, setIsInternational] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (state.items.length === 0) {
      router.push('/cart');
    }
  }, [state.items.length, router]);

  function handleFormSubmit(details: CustomerDetails) {
    setCustomerDetails(details);
    if (details.deliveryType === 'international') {
      setIsInternational(true);
    } else {
      setIsInternational(false);
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
          cartItems: state.items.map(({ productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool }) => ({
            productId, productName, variantId, variantName, tierQty, threadColour, unitPrice, quantity, isTool,
          })),
          subtotal,
        }),
      }).catch(() => {
        // Silently ignore — this is best-effort, never block the user
      });
    }
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

    dispatch({ type: 'CLEAR_CART' });
    router.push('/orders/' + reference);
  }

  // Render nothing while redirecting (empty cart)
  if (state.items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="font-body text-charcoal/60">Redirecting to your cart...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 font-heading text-sm font-semibold ${step === 1 ? 'text-gold' : 'text-charcoal/50'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-gold text-cocoa' : 'bg-charcoal/20 text-charcoal/50'}`}>
            1
          </span>
          Details
        </div>
        <div className="flex-1 h-px bg-charcoal/10" />
        <div className={`flex items-center gap-2 font-heading text-sm font-semibold ${step === 2 ? 'text-gold' : 'text-charcoal/50'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-gold text-cocoa' : 'bg-charcoal/20 text-charcoal/50'}`}>
            2
          </span>
          Review &amp; Pay
        </div>
      </div>

      {/* Step 1: Customer details form */}
      {step === 1 && !isInternational && (
        <CheckoutForm onSubmit={handleFormSubmit} defaultValues={customerDetails ?? undefined} />
      )}

      {/* International path: WhatsApp CTA */}
      {step === 1 && isInternational && (
        <div className="max-w-lg mx-auto">
          <h2 className="font-display text-2xl text-cocoa mb-6">International Shipping</h2>
          <div className="bg-stone-50 rounded-xl p-6 font-body text-sm text-charcoal mb-6">
            <p className="mb-4">
              For international orders, please contact us on WhatsApp to get a shipping quote.
            </p>
            <a
              href={BUSINESS.whatsapp.url("Hi, I'd like a shipping quote for my Twinkle Locs order")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-heading font-semibold py-3 px-6 rounded-lg hover:bg-[#1da851] transition-colors"
            >
              Contact us on WhatsApp
            </a>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { setIsInternational(false); setStep(1); }}
              className="font-heading text-sm text-charcoal/60 hover:text-cocoa underline"
            >
              Back to details
            </button>
            <Link
              href="/cart"
              className="font-heading text-sm text-charcoal/60 hover:text-cocoa underline"
            >
              Back to cart
            </Link>
          </div>
        </div>
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
    </main>
  );
}
