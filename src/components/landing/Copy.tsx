import { hasPlaceholder } from '@/lib/landing/config'

/**
 * Text for Halimun headings. Halimun has letters only: digits and punctuation
 * (, . ? & ' -) are set in Mistrully, the brand's other script, as product names
 * on the product page do for digits.
 */
export function DisplayText({ text }: { text: string }) {
  const parts = text.split(/([^A-Za-z\s]+)/).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        /[^A-Za-z\s]/.test(part) ? (
          <span key={i} className="font-accent-display">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** Small "Needs sign-off" tag on anything still waiting for Twinkle Locs' approval */
export function SignOffLabel({ children = 'Needs sign-off' }: { children?: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-block rounded bg-amber-700 px-1.5 py-0.5 align-middle font-heading text-[11px] font-bold not-italic uppercase leading-none tracking-wide text-white">
      {children}
    </span>
  )
}

/**
 * Editable copy from Admin → Ad landing page. Text still holding a "[confirm"
 * placeholder renders highlighted (yellow, dashed outline, "Needs sign-off"), so
 * nothing unapproved can look finished in a preview or slip into an ad.
 */
export function Copy({ text, display = false }: { text: string; display?: boolean }) {
  const content = display ? <DisplayText text={text} /> : text
  if (!hasPlaceholder(text)) return <>{content}</>
  return (
    <mark
      data-needs-signoff=""
      className="rounded-sm bg-yellow-200 px-1 text-charcoal outline-2 outline-offset-1 outline-amber-600 outline-dashed [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
    >
      {content}
      <SignOffLabel />
    </mark>
  )
}

/** A highlighted block where a photo from Twinkle Locs is still missing */
export function PhotoNeeded({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div
      data-needs-signoff=""
      className={`flex items-center justify-center bg-yellow-100 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgba(217,119,6,0.14)_14px_28px)] p-4 text-center outline-2 -outline-offset-4 outline-amber-600 outline-dashed ${className}`}
    >
      <p className="max-w-[16rem] font-heading text-sm font-semibold text-amber-900">
        <span className="mb-2 block">
          <SignOffLabel>Photo needed</SignOffLabel>
        </span>
        {label}
      </p>
    </div>
  )
}

/** Badge over a stand-in photo (a product shot used until the real one arrives) */
export function PhotoNeededBadge({ label }: { label: string }) {
  return (
    <span
      data-needs-signoff=""
      className="absolute left-3 top-3 z-10 max-w-[80%] rounded-md bg-yellow-200 px-2 py-1 font-heading text-xs font-bold text-amber-900 shadow outline-2 outline-amber-600 outline-dashed"
    >
      Photo needed: {label}
    </span>
  )
}
