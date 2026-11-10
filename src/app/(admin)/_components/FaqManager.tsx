'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Faq } from '@/types/db'

function answerPreview(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function FaqManager({ faqs: initial }: { faqs: Faq[] }) {
  const [faqs, setFaqs] = useState(initial)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<{ type: 'saving' | 'saved' | 'error'; message: string } | null>(null)

  useEffect(() => setFaqs(initial), [initial])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>()
    for (const f of faqs) {
      if (!map.has(f.category)) map.set(f.category, [])
      map.get(f.category)!.push(f)
    }
    return [...map.entries()]
  }, [faqs])

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const featuredCount = faqs.filter((f) => f.is_featured).length

  async function persistOrder(items: Faq[]) {
    setStatus({ type: 'saving', message: 'Saving order…' })
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: items.map((f, i) => ({ id: f.id, display_order: i })) }),
      })
      if (!res.ok) throw new Error()
      setStatus({ type: 'saved', message: 'Order saved' })
      setTimeout(() => setStatus(null), 2000)
    } catch {
      setStatus({ type: 'error', message: 'Could not save the new order. Refresh and try again.' })
    }
  }

  function handleDragEnd(category: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const items = faqs.filter((f) => f.category === category)
    const oldIndex = items.findIndex((f) => f.id === active.id)
    const newIndex = items.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex).map((f, i) => ({ ...f, display_order: i }))
    setFaqs((all) => {
      const others = all.filter((f) => f.category !== category)
      // keep category blocks where they were
      const firstIdx = all.findIndex((f) => f.category === category)
      const next = [...others]
      next.splice(firstIdx, 0, ...reordered)
      return next
    })
    void persistOrder(reordered)
  }

  async function toggleFeatured(faq: Faq) {
    const next = !faq.is_featured
    setFaqs((all) => all.map((f) => (f.id === faq.id ? { ...f, is_featured: next } : f)))
    const res = await fetch(`/api/admin/faqs/${faq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: next }),
    }).catch(() => null)
    if (!res?.ok) {
      setFaqs((all) => all.map((f) => (f.id === faq.id ? { ...f, is_featured: !next } : f)))
      setStatus({ type: 'error', message: 'Could not update. Try again.' })
    }
  }

  if (faqs.length === 0) {
    return <p className="text-stone-500 text-sm">No FAQs yet. Add your first question above.</p>
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-base font-semibold text-white mr-auto">
          {faqs.length} questions <span className="text-stone-500 font-normal">&middot; {featuredCount} on home page</span>
        </h2>
        <span aria-live="polite" className={`text-xs ${status?.type === 'error' ? 'text-red-300' : status?.type === 'saved' ? 'text-emerald-300' : 'text-stone-400'}`}>
          {status?.message}
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          aria-label="Search FAQs"
          className="w-56 px-3 py-1.5 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>
      {!searching && <p className="text-xs text-stone-500 -mt-3">Drag the handle (or focus it and use the arrow keys) to change the order customers see.</p>}

      {grouped.map(([categoryName, items]) => {
        const shown = searching
          ? items.filter((f) => f.question.toLowerCase().includes(q) || answerPreview(f.answer).toLowerCase().includes(q))
          : items
        if (shown.length === 0) return null
        return (
          <div key={categoryName} className="space-y-2">
            <h3 className="text-xs font-heading font-semibold text-stone-400 uppercase tracking-widest px-1">
              {categoryName} <span className="text-stone-600">{items.length}</span>
            </h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(categoryName, e)}>
              <SortableContext items={shown.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-stone-700 bg-stone-800/50 rounded-xl ring-1 ring-stone-700 overflow-hidden">
                  {shown.map((faq) => (
                    <SortableFaqRow key={faq.id} faq={faq} dragDisabled={searching} onToggleFeatured={() => toggleFeatured(faq)} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )
      })}
    </section>
  )
}

function SortableFaqRow({ faq, dragDisabled, onToggleFeatured }: { faq: Faq; dragDisabled: boolean; onToggleFeatured: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: faq.id,
    disabled: dragDisabled,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-3 py-3 bg-stone-800/50 ${isDragging ? 'relative z-10 shadow-xl ring-1 ring-gold' : ''}`}
    >
      {!dragDisabled && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder: ${faq.question}`}
          className="p-1.5 -ml-1 rounded text-stone-500 hover:text-white cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-100 truncate">{faq.question}</p>
        <p className="text-xs text-stone-500 truncate">{answerPreview(faq.answer)}</p>
      </div>
      <button
        type="button"
        onClick={onToggleFeatured}
        aria-pressed={faq.is_featured}
        title={faq.is_featured ? 'Shown on home page. Click to remove' : 'Show on home page'}
        className={`shrink-0 px-2 py-1 rounded-md text-xs transition-colors ${faq.is_featured ? 'text-gold-light bg-gold/15' : 'text-stone-500 hover:text-stone-300'}`}
      >
        {faq.is_featured ? '★ Home' : '☆ Home'}
      </button>
      <Link href={`/admin/faqs/${faq.id}`} className="shrink-0 px-2 py-1 text-xs text-gold-light hover:text-white font-medium transition-colors">
        Edit
      </Link>
    </li>
  )
}
