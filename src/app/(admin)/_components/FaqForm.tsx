'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Faq } from '@/types/db'

interface FaqFormProps {
  faq?: Faq
}

export function FaqForm({ faq }: FaqFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEdit = !!faq

  const [category, setCategory] = useState(faq?.category ?? '')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [displayOrder, setDisplayOrder] = useState(faq?.display_order ?? 0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/faqs/${faq.id}` : '/api/admin/faqs'
        const method = isEdit ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: category.trim(),
            question: question.trim(),
            answer: answer.trim(),
            display_order: displayOrder,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to save FAQ')
          return
        }

        if (isEdit) {
          showToast('success', 'FAQ updated')
        } else {
          router.push('/admin/faqs')
        }
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  function handleDelete() {
    if (!faq) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/faqs/${faq.id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to delete FAQ')
          return
        }

        router.push('/admin/faqs')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {/* Category */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Category
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Shipping, Products, Care, Orders"
          required
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      {/* Question */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How long does delivery take?"
          required
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      {/* Answer */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write the answer here..."
          required
          rows={4}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
        />
      </div>

      {/* Display order */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Display order
          <span className="ml-1.5 text-stone-500 font-normal">(optional — lower numbers appear first)</span>
        </label>
        <input
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(Number(e.target.value))}
          min={0}
          className="w-32 px-3 py-2 bg-stone-800 border border-stone-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add FAQ'}
        </button>

        {isEdit && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2.5 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
          >
            Delete
          </button>
        )}

        {isEdit && showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400">Are you sure?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-stone-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
