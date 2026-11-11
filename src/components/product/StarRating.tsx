/**
 * Five stars filled to `value` (halves and tenths show as partly filled).
 * Screen readers hear "Rated 4.5 out of 5" instead of five star characters.
 */
export function StarRating({ value, className = 'text-base' }: { value: number; className?: string }) {
  const rounded = Math.round(value * 10) / 10
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className={`relative inline-block leading-none tracking-[0.1em] ${className}`} role="img" aria-label={`Rated ${rounded} out of 5`}>
      <span className="text-charcoal/20" aria-hidden="true">★★★★★</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-gold" style={{ width: `${pct}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  )
}

export type RatingSummary = { average: number; count: number }

export function summariseRatings(ratings: number[]): RatingSummary {
  if (ratings.length === 0) return { average: 0, count: 0 }
  return { average: ratings.reduce((s, r) => s + r, 0) / ratings.length, count: ratings.length }
}
