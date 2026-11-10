'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Faq } from '@/types/db'
import { RichTextEditor } from './RichTextEditor'

interface FaqFormProps {
  faq?: Faq
  categories?: string[]
  /** Called after a successful create (used by the inline "Add FAQ" panel). */
  onCreated?: () => void
}

const inputClass =
  'w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold'

export function FaqForm({ faq, categories = [], onCreated }: FaqFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEdit = !!faq

  const [category, setCategory] = useState(faq?.category ?? '')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [isFeatured, setIsFeatured] = useState(faq?.is_featured ?? false)
  const [editorKey, setEditorKey] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!answer.replace(/<[^>]+>/g, '').trim()) {
      showToast('error', 'Write an answer first')
      return
    }

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
            is_featured: isFeatured,
            // New FAQs go to the end of their category
            ...(isEdit ? {} : { display_order: 9999 }),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to save FAQ')
          return
        }

        if (isEdit) {
          showToast('success', 'FAQ updated, live on /faq')
          router.refresh()
        } else {
          // Keep the category so several questions can be added in a row
          setQuestion('')
          setAnswer('')
          setIsFeatured(false)
          setEditorKey((k) => k + 1)
          showToast('success', 'FAQ added, live on /faq')
          onCreated?.()
          router.refresh()
        }
      } catch {
        showToast('error', 'Network error, please try again')
      }
    })
  }

  function handleDelete() {
    if (!faq) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/faqs/${faq.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to delete FAQ')
          return
        }
        router.push('/admin/faqs')
        router.refresh()
      } catch {
        showToast('error', 'Network error, please try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-live="polite">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`faq-cat-${faq?.id ?? 'new'}`} className="block text-sm font-medium text-stone-300">Category</label>
          <input
            id={`faq-cat-${faq?.id ?? 'new'}`}
            type="text"
            list="faq-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Shipping"
            required
            className={inputClass}
          />
          <datalist id="faq-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`faq-q-${faq?.id ?? 'new'}`} className="block text-sm font-medium text-stone-300">Question</label>
          <input
            id={`faq-q-${faq?.id ?? 'new'}`}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Write it the way a customer would ask, e.g. Will the beads fade?"
            required
            className={inputClass}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${category === c ? 'bg-gold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-stone-300">Answer</span>
        <RichTextEditor
          key={editorKey}
          value={answer}
          onChange={setAnswer}
          variant="faq"
          placeholder="Keep it short and friendly. Link to a product or the shipping page if it helps."
        />
        <p className="text-xs text-stone-500">Answers also appear in Google results, so lead with the direct answer.</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="mt-0.5 w-4 h-4 accent-gold" />
        <span>
          <span className="block text-sm text-stone-200">Show on the home page</span>
          <span className="block text-xs text-stone-500">Featured questions appear in the &ldquo;Good to know&rdquo; section. Pick the 3 to 6 that stop people buying.</span>
        </span>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-gold hover:bg-gold-deep disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add FAQ'}
        </button>

        {isEdit && !showDeleteConfirm && (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2.5 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
            Delete
          </button>
        )}

        {isEdit && showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400">Delete this question?</span>
            <button type="button" onClick={handleDelete} disabled={isPending} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-stone-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
