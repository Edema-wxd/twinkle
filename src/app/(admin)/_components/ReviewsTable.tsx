'use client'

import { useState, useTransition } from 'react'

export interface ReviewRow {
  id: string
  product_id: string
  product_name: string
  author_name: string
  body: string
  rating: number
  created_at: string
}

interface ReviewsTableProps {
  reviews: ReviewRow[]
}

export function ReviewsTable({ reviews: initial }: ReviewsTableProps) {
  const [reviews, setReviews] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAuthor, setEditAuthor] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editRating, setEditRating] = useState(5)
  const [editHover, setEditHover] = useState(0)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function startEdit(review: ReviewRow) {
    setEditingId(review.id)
    setEditAuthor(review.author_name)
    setEditBody(review.body)
    setEditRating(review.rating)
    setEditHover(0)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleSave(id: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_name: editAuthor, reviewBody: editBody, rating: editRating }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to update review')
          return
        }

        setReviews((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, author_name: editAuthor, body: editBody, rating: editRating }
              : r
          )
        )
        setEditingId(null)
        showToast('success', 'Review updated')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })

        if (!res.ok) {
          showToast('error', 'Failed to delete review')
          return
        }

        setReviews((prev) => prev.filter((r) => r.id !== id))
        showToast('success', 'Review deleted')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  if (reviews.length === 0) {
    return (
      <p className="text-stone-500 text-sm py-4">No reviews yet. Add one below.</p>
    )
  }

  return (
    <div className="space-y-3">
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

      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-800/60">
              <th className="text-left px-4 py-3 text-stone-400 font-medium">Product</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">Author</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium w-64">Review</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">Rating</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700/60">
            {reviews.map((review) =>
              editingId === review.id ? (
                <tr key={review.id} className="bg-stone-800/40">
                  <td className="px-4 py-3 text-stone-300 align-top">{review.product_name}</td>
                  <td className="px-4 py-3 align-top">
                    <input
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full px-2 py-1 bg-stone-700 border border-stone-600 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full px-2 py-1 bg-stone-700 border border-stone-600 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-gold resize-y"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div
                      className="flex gap-0.5"
                      onMouseLeave={() => setEditHover(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditRating(star)}
                          onMouseEnter={() => setEditHover(star)}
                          className="text-lg leading-none focus:outline-none"
                        >
                          <span className={star <= (editHover || editRating) ? 'text-gold' : 'text-stone-600'}>
                            {star <= (editHover || editRating) ? '★' : '☆'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 align-top">
                    {new Date(review.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(review.id)}
                        disabled={isPending}
                        className="px-3 py-1 bg-gold hover:bg-yellow-600 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isPending}
                        className="px-3 py-1 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-xs font-medium rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={review.id} className="hover:bg-stone-800/30 transition-colors">
                  <td className="px-4 py-3 text-stone-300 align-top">{review.product_name}</td>
                  <td className="px-4 py-3 text-white font-medium align-top">{review.author_name}</td>
                  <td className="px-4 py-3 text-stone-400 align-top max-w-xs">
                    <span className="line-clamp-3">{review.body}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-gold tracking-tight">
                      {'★'.repeat(review.rating)}
                      <span className="text-stone-600">{'★'.repeat(5 - review.rating)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 align-top whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(review)}
                        className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={isPending}
                        className="px-3 py-1 bg-red-900/50 hover:bg-red-800/60 disabled:opacity-50 text-red-300 text-xs font-medium rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
