import { Review } from '@/lib/types/review'
import { StarRating, summariseRatings } from './StarRating'

interface ProductReviewsProps {
  reviews: Review[]
}

export function ProductReviews({ reviews }: ProductReviewsProps) {
  const { average, count } = summariseRatings(reviews.map((r) => r.rating))
  // How many reviews gave each star rating, 5 down to 1
  const byStars = [5, 4, 3, 2, 1].map((stars) => ({ stars, n: reviews.filter((r) => r.rating === stars).length }))

  return (
    <div id="reviews" className="scroll-mt-28">
      <h2 className="font-display text-2xl text-forest mb-6">Customer reviews</h2>

      {count === 0 ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-forest/10">
          <p className="font-heading font-semibold text-forest">No reviews yet</p>
          <p className="mt-1 font-body text-sm text-charcoal/70">
            Bought these? After your order is delivered we&apos;ll email you a link to review them.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-6 flex flex-col gap-5 rounded-xl bg-white p-6 ring-1 ring-forest/10 sm:flex-row sm:items-center sm:gap-10">
            <div className="text-center sm:text-left">
              <p className="font-heading text-4xl font-semibold text-forest">{average.toFixed(1)}</p>
              <StarRating value={average} className="text-xl" />
              <p className="mt-1 font-body text-sm text-charcoal/70">
                {count} {count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <ul className="flex-1 space-y-1.5" aria-label="Ratings breakdown">
              {byStars.map(({ stars, n }) => (
                <li key={stars} className="flex items-center gap-3 font-body text-sm text-charcoal/70">
                  <span className="w-12 shrink-0">{stars} star</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-charcoal/10" aria-hidden="true">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${(n / count) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right tabular-nums">
                    {n}
                    <span className="sr-only"> {n === 1 ? 'review' : 'reviews'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <article key={review.id} className="bg-white rounded-xl p-6 shadow-sm border border-stone">
                <StarRating value={review.rating} className="text-base" />
                <div className="mt-2">
                  <span className="font-heading font-semibold text-forest">{review.author_name}</span>
                  <span className="font-body text-sm text-charcoal/60 ml-2">
                    {new Date(review.created_at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <p className="font-body text-charcoal/80 mt-3 leading-relaxed">{review.body}</p>
              </article>
            ))}
          </div>

          <p className="mt-6 font-body text-sm text-charcoal/70">
            Bought these? After delivery we&apos;ll email you a link to add your review.
          </p>
        </>
      )}
    </div>
  )
}
