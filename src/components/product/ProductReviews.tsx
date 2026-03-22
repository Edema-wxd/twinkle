import { Review } from '@/lib/types/review'

interface ProductReviewsProps {
  reviews: Review[]
}

export function ProductReviews({ reviews }: ProductReviewsProps) {
  return (
    <div>
      <h2 className="font-display text-2xl text-cocoa mb-6">Customer Reviews</h2>

      {reviews.length === 0 ? (
        <p className="font-body text-charcoal/50 italic">
          No reviews yet. Be the first to share your experience.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-stone"
            >
              {/* Star rating row */}
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={i <= review.rating ? 'text-gold' : 'text-charcoal/20'}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Author + date row */}
              <div>
                <span className="font-heading font-semibold text-cocoa">
                  {review.author_name}
                </span>
                <span className="font-body text-sm text-charcoal/50 ml-2">
                  {new Date(review.created_at).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Review body */}
              <p className="font-body text-charcoal/80 mt-3 leading-relaxed">
                {review.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
