'use client';

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
}

export function PaystackButton({ config, onSuccess, onClose, disabled }: PaystackButtonProps) {
  async function handlePay() {
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
      onSuccess(tranx) {
        onSuccess(tranx.reference);
      },
      onCancel() {
        onClose();
      },
    });
  }

  return (
    <button
      onClick={handlePay}
      disabled={disabled}
      className="w-full bg-gold text-cocoa font-heading font-semibold py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Pay ₦{(config.amountKobo / 100).toLocaleString()}
    </button>
  );
}
