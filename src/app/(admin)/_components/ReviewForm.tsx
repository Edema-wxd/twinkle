'use client'

import { useState, useTransition } from 'react'

interface ProductOption {
  id: string
  name: string
}

interface ReviewFormProps {
  products: ProductOption[]
}

export function ReviewForm({ products }: ReviewFormProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [authorName, setAuthorName] = useState('')
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            author_name: authorName.trim(),
            body: body.trim(),
            rating,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to save review')
          return
        }

        showToast('success', 'Review saved')
        // Reset form
        setProductId(products[0]?.id ?? '')
        setAuthorName('')
        setBody('')
        setRating(5)
        setHoverRating(0)
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  const activeRating = hoverRating || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-600/40'
              : 'bg-red-900/60 text-red-300 ring-1 ring-red-600/40'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Product picker */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Product
        </label>
        {products.length === 0 ? (
          <p className="text-stone-500 text-sm">No active products found.</p>
        ) : (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Author name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Author name
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="e.g. Adaeze O."
          required
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      {/* Review body */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Review text
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the customer's review here..."
          required
          rows={4}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
        />
      </div>

      {/* Star rating */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Star rating
        </label>
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
              className="text-2xl leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
            >
              <span
                className={
                  star <= activeRating ? 'text-gold' : 'text-stone-600'
                }
              >
                {star <= activeRating ? '★' : '☆'}
              </span>
            </button>
          ))}
          <span className="ml-2 text-sm text-stone-400 self-center">
            {rating} / 5
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || products.length === 0}
        className="px-6 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isPending ? 'Saving…' : 'Save review'}
      </button>
    </form>
  )
}
