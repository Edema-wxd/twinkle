'use client'

import { useState, useTransition } from 'react'

interface Product {
  productId: string
  productName: string
}

interface ReviewFormProps {
  orderRef: string
  products: Product[]
}

export function ReviewForm({ orderRef, products }: ReviewFormProps) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.productId ?? '')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeRating = hoverRating || rating

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref: orderRef,
            productId: selectedProduct,
            rating,
            body: body.trim(),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? 'Something went wrong. Please try again.')
          return
        }

        setSubmitted(true)
      } catch {
        setError('Network error — please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-4">🙏</div>
        <h2 className="font-heading text-2xl font-semibold text-cocoa mb-2">
          Thank you!
        </h2>
        <p className="font-body text-charcoal/70">
          Your review has been submitted. We really appreciate you taking the time.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {products.length > 1 && (
        <div className="space-y-2">
          <p className="font-body text-sm font-medium text-charcoal">
            Which product are you reviewing?
          </p>
          <div className="space-y-2">
            {products.map((p) => (
              <label
                key={p.productId}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="product"
                  value={p.productId}
                  checked={selectedProduct === p.productId}
                  onChange={() => setSelectedProduct(p.productId)}
                  className="accent-gold w-4 h-4"
                />
                <span className="font-body text-sm text-charcoal group-hover:text-cocoa transition-colors">
                  {p.productName}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-body text-sm font-medium text-charcoal">Your rating</p>
        <div
          className="flex gap-1"
          onMouseLeave={() => setHoverRating(0)}
          role="group"
          aria-label="Star rating"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              className="text-3xl leading-none transition-colors focus:outline-none"
            >
              <span className={star <= activeRating ? 'text-gold' : 'text-charcoal/20'}>
                {star <= activeRating ? '★' : '☆'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="review-body" className="block font-body text-sm font-medium text-charcoal">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us what you loved about your order..."
          required
          rows={4}
          className="w-full border border-charcoal/20 rounded-xl px-4 py-3 font-body text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-gold resize-none"
        />
      </div>

      {error && (
        <p className="font-body text-sm text-terracotta">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gold text-white font-heading font-semibold py-3 rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
