'use client';

import { useState } from 'react';

interface PaystackConfig {
  email: string;
  amountKobo: number;
  reference: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

interface PaystackButtonProps {
  config: PaystackConfig;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  disabled?: boolean;
  /** Last-moment server check (stock, prices). Return false to stop before Paystack opens. */
  beforePay?: () => Promise<boolean>;
}

export function PaystackButton({ config, onSuccess, onClose, disabled, beforePay }: PaystackButtonProps) {
  // Guards against double taps opening two popups while the SDK loads
  const [opening, setOpening] = useState(false);

  async function handlePay() {
    if (opening) return;
    setOpening(true);
    try {
      if (beforePay && !(await beforePay())) {
        setOpening(false);
        return;
      }
      const PaystackPop = (await import('@paystack/inline-js')).default;
      const popup = new PaystackPop();
      popup.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: config.email,
        amount: config.amountKobo,
        reference: config.reference,
        currency: 'NGN',
        // The @types/paystack__inline-js metadata type only allows custom_fields,
        // but the runtime SDK accepts arbitrary objects. We cast here to pass cart metadata.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: config.metadata as any,
        onLoad() {
          setOpening(false);
        },
        onSuccess(tranx) {
          onSuccess(tranx.reference);
        },
        onCancel() {
          setOpening(false);
          onClose();
        },
        onError() {
          setOpening(false);
          onClose();
        },
      });
    } catch {
      setOpening(false);
      onClose();
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || opening}
        aria-busy={opening}
        className="w-full min-h-14 bg-forest text-cream font-heading font-semibold py-4 rounded-lg hover:bg-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        {opening ? 'Checking your bag…' : `Pay ₦${(config.amountKobo / 100).toLocaleString()}`}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 font-body text-xs text-charcoal/70">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        Secured by Paystack. Card, bank transfer or USSD.
      </p>
    </div>
  );
}
