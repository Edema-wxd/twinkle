'use client'

import { useState, useEffect, useTransition } from 'react'

interface TestimonialRow {
  id: string
  name: string
  quote: string
  displayOrder: number
  isActive: boolean
}

function TestimonialForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: TestimonialRow
  onSave: (data: Omit<TestimonialRow, 'id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [quote, setQuote] = useState(initial?.quote ?? '')
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adaeze O."
          className="w-full px-3 py-2 bg-stone-900 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">Quote</label>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={3}
          placeholder="What the customer said..."
          className="w-full px-3 py-2 bg-stone-900 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
        />
      </div>
      <div className="flex items-center gap-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Display order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            className="w-24 px-3 py-2 bg-stone-900 border border-stone-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pt-5">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-gold' : 'bg-stone-600'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-stone-300">{isActive ? 'Visible' : 'Hidden'}</span>
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onSave({ name: name.trim(), quote: quote.trim(), displayOrder, isActive })}
          disabled={!name.trim() || !quote.trim()}
          className="px-4 py-2 bg-gold hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-stone-400 hover:text-white text-sm transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminTestimonialsPage() {
  const [rows, setRows] = useState<TestimonialRow[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/admin/testimonials')
      .then((r) => r.json())
      .then(setRows)
      .catch(console.error)
  }, [])

  function handleAdd(data: Omit<TestimonialRow, 'id'>) {
    startTransition(async () => {
      const res = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, quote: data.quote, display_order: data.displayOrder }),
      })
      if (res.ok) {
        const row = await res.json()
        setRows((prev) => [...prev, row].sort((a, b) => a.displayOrder - b.displayOrder))
        setAdding(false)
        showToast('Testimonial added')
      }
    })
  }

  function handleEdit(id: string, data: Omit<TestimonialRow, 'id'>) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, quote: data.quote, display_order: data.displayOrder, is_active: data.isActive }),
      })
      if (res.ok) {
        const updated = await res.json()
        setRows((prev) => prev.map((r) => r.id === id ? updated : r).sort((a, b) => a.displayOrder - b.displayOrder))
        setEditing(null)
        showToast('Saved')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((r) => r.id !== id))
      showToast('Deleted')
    })
  }

  return (
    <div className="p-6 max-w-3xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg bg-emerald-900/90 text-emerald-300 ring-1 ring-emerald-600/40">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-white">Testimonials</h1>
          <p className="text-sm text-stone-400 mt-1">Shown on the homepage carousel</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 bg-gold hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add testimonial
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-6">
          <TestimonialForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="space-y-3">
        {rows.length === 0 && !adding && (
          <p className="text-stone-500 text-sm">No testimonials yet.</p>
        )}
        {rows.map((row) =>
          editing === row.id ? (
            <TestimonialForm
              key={row.id}
              initial={row}
              onSave={(data) => handleEdit(row.id, data)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={row.id} className={`flex items-start gap-4 p-4 rounded-xl border ${row.isActive ? 'border-stone-700 bg-stone-800/50' : 'border-stone-800 bg-stone-900/40 opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{row.name}</p>
                <p className="text-sm text-stone-400 mt-1 line-clamp-2">&ldquo;{row.quote}&rdquo;</p>
                <p className="text-xs text-stone-600 mt-1">Order: {row.displayOrder} · {row.isActive ? 'Visible' : 'Hidden'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing(row.id)}
                  className="px-3 py-1.5 text-xs text-stone-300 hover:text-white border border-stone-600 hover:border-stone-400 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
