'use client'

import { useEffect, useState } from 'react'
import type { BlogPendingChanges } from '@/types/db'

type RevisionRow = { id: string; label: string; createdAt: string; createdBy: string | null; title: string; words: number }
export type RevisionSnapshot = Omit<BlogPendingChanges, 'savedAt' | 'savedBy'> & { published: boolean; publishedAt: string | null }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Saved versions of a post. "Load" puts a version back into the editor; nothing
 * on the site changes until the admin saves or updates the post.
 */
export function BlogHistoryDialog({ postId, onClose, onLoad }: { postId: string; onClose: () => void; onLoad: (s: RevisionSnapshot, label: string) => void }) {
  const [rows, setRows] = useState<RevisionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/blog/${postId}/revisions`, { cache: 'no-store' })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { revisions?: RevisionRow[]; error?: string }
        if (!r.ok) throw new Error(data.error ?? 'Couldn’t load the history.')
        if (!cancelled) setRows(data.revisions ?? [])
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Couldn’t load the history.'))
    return () => {
      cancelled = true
    }
  }, [postId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function load(row: RevisionRow) {
    setLoadingId(row.id)
    try {
      const r = await fetch(`/api/admin/blog/${postId}/revisions/${row.id}`, { cache: 'no-store' })
      const data = (await r.json().catch(() => ({}))) as { snapshot?: RevisionSnapshot; error?: string }
      if (!r.ok || !data.snapshot) throw new Error(data.error ?? 'Couldn’t load that version.')
      onLoad(data.snapshot, `${row.label}, ${when(row.createdAt)}`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load that version.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="history-title" className="w-full sm:max-w-xl max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-stone-900 ring-1 ring-stone-700 shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-stone-800">
          <div>
            <h2 id="history-title" className="font-heading text-lg font-semibold text-white">History</h2>
            <p className="mt-1 text-sm text-stone-400">Every save is kept (the last 50). Loading one puts it in the editor; the site only changes when you save.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-stone-400 hover:text-white text-xl">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
          {!rows && !error && <p className="text-sm text-stone-400">Loading…</p>}
          {rows && rows.length === 0 && <p className="text-sm text-stone-400">No saved versions yet. They start with the next save.</p>}
          {rows && rows.length > 0 && (
            <ol className="divide-y divide-stone-800">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      {r.label}
                      {i === 0 && <span className="ml-2 rounded-full bg-stone-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-300">Latest</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {when(r.createdAt)}
                      {r.createdBy ? ` · ${r.createdBy}` : ''} · {r.words} words · “{r.title}”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => load(r)}
                    disabled={loadingId !== null}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-stone-200 border border-stone-600 rounded-lg hover:border-stone-400 disabled:opacity-50"
                  >
                    {loadingId === r.id ? 'Loading…' : 'Load'}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
