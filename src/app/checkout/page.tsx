'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart/CartContext';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import type { CustomerDetails } from '@/components/checkout/CheckoutForm';
import { OrderReview } from '@/components/checkout/OrderReview';
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
    }
  }

  function handlePaymentSuccess(reference: string) {
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
        <CheckoutForm onSubmit={handleFormSubmit} />
      )}

      {/* International path: WhatsApp CTA */}
      {step === 1 && isInternational && (
        <div className="max-w-lg mx-auto">
          <h2 className="font-display text-2xl text-cocoa mb-6">International Shipping</h2>
          <div className="bg-stone-50 rounded-xl p-6 font-body text-sm text-charcoal mb-6">
            <p className="mb-4">
              For international orders, please contact us on WhatsApp to get a shipping quote.
            </p>
            {/* TODO: Replace placeholder number with actual Twinkle Locs WhatsApp business number */}
            <a
              href="https://wa.me/2348000000000?text=Hi%2C+I%27d+like+a+shipping+quote+for+my+Twinkle+Locs+order"
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
