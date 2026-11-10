'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { MediaItem, MediaLibrary, MediaUsage } from '@/lib/media-library'

type Filter = 'all' | 'unused' | 'cover' | 'post' | 'product'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All photos' },
  { value: 'unused', label: 'Not used yet' },
  { value: 'cover', label: 'Blog covers' },
  { value: 'post', label: 'Inside posts' },
  { value: 'product', label: 'Products' },
]

const USAGE_LABEL: Record<MediaUsage['kind'], string> = {
  cover: 'Cover of',
  post: 'Inside',
  product: 'Product',
  page: 'Page',
}

const PAGE_SIZE = 48

interface Props {
  /** The image currently chosen, marked "Current" in the grid */
  current: string | null
  onClose: () => void
  onSelect: (url: string) => void
  title?: string
}

function formatSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ms: number | null): string | null {
  if (!ms) return null
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MediaLibraryDialog({ current, onClose, onSelect, title = 'Choose a photo' }: Props) {
  const [library, setLibrary] = useState<MediaLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<string | null>(null)
  // Natural sizes, learned as thumbnails load, to warn about tall photos
  const [dims, setDims] = useState<Record<string, { w: number; h: number }>>({})
  // Images that failed to load (deleted, or hosted somewhere the site can't show)
  const [broken, setBroken] = useState<Record<string, true>>({})
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError(null)
    setLibrary(null)
    try {
      const res = await fetch('/api/admin/media', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Couldn’t load your photos.')
      setLibrary(data as MediaLibrary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load your photos.')
    }
  }, [])

  useEffect(() => {
    load()
    searchRef.current?.focus()
  }, [load])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const counts = useMemo(() => {
    const items = library?.items ?? []
    return {
      all: items.length,
      unused: items.filter((i) => i.usedIn.length === 0).length,
      cover: items.filter((i) => i.usedIn.some((u) => u.kind === 'cover')).length,
      post: items.filter((i) => i.usedIn.some((u) => u.kind === 'post')).length,
      product: items.filter((i) => i.usedIn.some((u) => u.kind === 'product')).length,
    } satisfies Record<Filter, number>
  }, [library])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (library?.items ?? []).filter((i) => {
      if (filter === 'unused' && i.usedIn.length > 0) return false
      if (filter !== 'all' && filter !== 'unused' && !i.usedIn.some((u) => u.kind === filter)) return false
      if (!q) return true
      return i.name.toLowerCase().includes(q) || i.usedIn.some((u) => u.label.toLowerCase().includes(q))
    })
  }, [library, query, filter])

  useEffect(() => setLimit(PAGE_SIZE), [query, filter])

  const selectedItem: MediaItem | undefined = selected ? library?.items.find((i) => i.url === selected) : undefined
  const selectedDims = selected ? dims[selected] : undefined
  const isTall = selectedDims ? selectedDims.h > selectedDims.w : false

  function confirm(url = selected) {
    if (!url) return
    onSelect(url)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-library-title"
        className="w-full sm:max-w-4xl h-[92vh] sm:h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-stone-900 ring-1 ring-stone-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5">
          <div>
            <h2 id="media-library-title" className="font-heading text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-400">Reuse a photo you’ve already uploaded for a product, post or page.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-stone-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-5 sm:px-6 pt-4 pb-3 space-y-3 border-b border-stone-800">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name, product or post title"
            aria-label="Search photos"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" role="group" aria-label="Filter photos">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.value ? 'bg-gold text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {f.label}
                {library && <span className="ml-1 opacity-70">{counts[f.value]}</span>}
              </button>
            ))}
          </div>
          {library?.warning && <p className="text-xs text-amber-300">{library.warning}</p>}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {error ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <p role="alert" className="text-sm text-red-300">{error}</p>
              <button type="button" onClick={load} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700">
                Try again
              </button>
            </div>
          ) : !library ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading photos">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-lg bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <p className="text-sm text-stone-300">{library.items.length === 0 ? 'No photos uploaded yet.' : 'No photos match.'}</p>
              <p className="text-xs text-stone-500">
                {library.items.length === 0 ? 'Upload a cover instead, and it’ll show up here next time.' : 'Try another search or filter.'}
              </p>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visible.slice(0, limit).map((item) => {
                  const isSelected = item.url === selected
                  const isCurrent = item.url === current
                  const d = dims[item.url]
                  const isBroken = !!broken[item.url]
                  return (
                    <li key={item.url}>
                      <button
                        type="button"
                        onClick={() => setSelected(item.url)}
                        onDoubleClick={() => confirm(item.url)}
                        aria-pressed={isSelected}
                        title={item.name}
                        className={`group relative block w-full aspect-[4/3] rounded-lg overflow-hidden bg-stone-800 ring-2 transition ${
                          isSelected ? 'ring-gold' : 'ring-transparent hover:ring-stone-500'
                        } focus:outline-none focus-visible:ring-gold`}
                      >
                        {isBroken ? (
                          <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-stone-500">Preview unavailable</span>
                        ) : (
                          <Image
                            src={item.url}
                            alt={item.name}
                            fill
                            sizes="(min-width: 768px) 220px, 45vw"
                            className="object-cover"
                            unoptimized
                            onLoad={(e) => {
                              const img = e.currentTarget
                              if (img.naturalWidth && !dims[item.url]) {
                                setDims((prev) => ({ ...prev, [item.url]: { w: img.naturalWidth, h: img.naturalHeight } }))
                              }
                            }}
                            onError={() => setBroken((prev) => ({ ...prev, [item.url]: true }))}
                          />
                        )}
                        <span className="absolute top-1.5 left-1.5 flex gap-1">
                          {isCurrent && <span className="px-1.5 py-0.5 rounded bg-forest/90 text-[10px] font-semibold text-white">Current</span>}
                          {item.usedIn.length === 0 && <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-[10px] text-stone-300">Not used</span>}
                          {d && d.h > d.w && <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-[10px] text-amber-300">Tall</span>}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center text-sm" aria-hidden="true">
                            ✓
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent text-left text-[11px] text-stone-200 truncate">
                          {item.usedIn[0] ? `${USAGE_LABEL[item.usedIn[0].kind]} ${item.usedIn[0].label}` : item.name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {visible.length > limit && (
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setLimit((l) => l + PAGE_SIZE)} className="px-4 py-2 text-sm rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700">
                    Show more ({visible.length - limit} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-t border-stone-800 bg-stone-900">
          <div className="flex-1 min-w-0 text-xs text-stone-400" aria-live="polite">
            {selectedItem ? (
              <>
                <p className="text-stone-200 truncate">{selectedItem.name}</p>
                <p className="truncate">
                  {[
                    selectedDims ? `${selectedDims.w} × ${selectedDims.h}` : null,
                    formatSize(selectedItem.size),
                    formatDate(selectedItem.uploadedAt) ? `uploaded ${formatDate(selectedItem.uploadedAt)}` : null,
                    selectedItem.usedIn.length > 0
                      ? `used in ${selectedItem.usedIn.length} place${selectedItem.usedIn.length === 1 ? '' : 's'}`
                      : 'not used anywhere yet',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {broken[selectedItem.url] && <p className="text-amber-300">This photo can’t be previewed, so it may not show on the site either. Pick another if you can.</p>}
                {isTall && <p className="text-amber-300">This photo is taller than it is wide, so the top and bottom will be cropped on cards and link previews.</p>}
              </>
            ) : (
              <p>Pick a photo. Landscape photos work best for covers.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-300 hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirm()}
              disabled={!selected}
              className="px-5 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              Use this photo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
