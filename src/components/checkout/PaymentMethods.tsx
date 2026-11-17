/**
 * Accepted payment methods, shown under the Pay button. Simple inline marks
 * (no third-party images or requests), each labelled for screen readers.
 */
export function PaymentMethods({ className = '' }: { className?: string }) {
  return (
    <ul aria-label="Pay with Visa, Mastercard, bank transfer or USSD" className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      <li>
        <Badge label="Visa">
          <svg viewBox="0 0 48 16" className="h-3.5 w-auto" aria-hidden="true">
            <text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="0.5">VISA</text>
          </svg>
        </Badge>
      </li>
      <li>
        <Badge label="Mastercard">
          <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-hidden="true">
            <circle cx="12" cy="10" r="8" fill="#EB001B" />
            <circle cx="20" cy="10" r="8" fill="#F79E1B" />
            <path d="M16 3.07a8 8 0 010 13.86 8 8 0 010-13.86z" fill="#FF5F00" />
          </svg>
        </Badge>
      </li>
      <li>
        <Badge label="Bank transfer">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-forest" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10l9-6 9 6" />
            <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
            <path d="M3 21h18" />
          </svg>
          <span className="font-body text-[11px] font-semibold text-forest">Transfer</span>
        </Badge>
      </li>
      <li>
        <Badge label="USSD">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-forest" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2" />
            <path d="M10 6h4M10 10h.01M14 10h.01M10 13.5h.01M14 13.5h.01M10 17h.01M14 17h.01" />
          </svg>
          <span className="font-body text-[11px] font-semibold text-forest">USSD</span>
        </Badge>
      </li>
    </ul>
  )
}

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span title={label} className="inline-flex h-7 min-w-11 items-center justify-center gap-1 rounded-md bg-white px-2 ring-1 ring-charcoal/15">
      <span className="sr-only">{label}</span>
      {children}
    </span>
  )
}
