'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { MediaItem, MediaLibrary, MediaUsage } from '@/lib/media-library'

type Filter = 'all' | 'unused' | 'cover' | 'post' | 'product' | 'page'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All photos' },
  { value: 'unused', label: 'Not used yet' },
  { value: 'cover', label: 'Blog covers' },
  { value: 'post', label: 'Inside posts' },
  { value: 'product', label: 'Products' },
  { value: 'page', label: 'About page' },
]

const USAGE_LABEL: Record<MediaUsage['kind'], string> = {
  cover: 'Cover of',
  post: 'Inside',
  product: 'Product',
  page: 'Page',
}

const PAGE_SIZE = 48

interface Props {
  /** Image(s) already in place, marked "Current" in the grid */
  current?: string | string[] | null
  onClose: () => void
  /** The chosen URLs, in the order they were picked */
  onSelect: (urls: string[]) => void
  title?: string
  /** Allow picking several photos (inserting into a post body) */
  multiple?: boolean
  /**
   * What the photo is for, which decides the crop warning:
   * 'cover' (landscape cards + link previews) warns about tall photos,
   * 'product' (square tiles) warns about photos far from square,
   * 'page' (About page: a wide strip, top-anchored) warns about square and tall photos, 'body' never warns
   */
  purpose?: 'cover' | 'body' | 'product' | 'page'
  /** Multiple mode: the most photos that can be picked (e.g. free product image slots) */
  max?: number
}

const CURRENT_LABEL: Record<NonNullable<Props['purpose']>, string> = {
  cover: 'Current',
  body: 'In this post',
  product: 'Already added',
  page: 'Current',
}

/** Crop warning for a photo of this size, used for both the tile badge and the footer note. */
function cropWarning(purpose: NonNullable<Props['purpose']>, d: { w: number; h: number } | undefined): { badge: string; text: string } | null {
  if (!d) return null
  const ratio = d.w / d.h
  if (purpose === 'cover' && ratio < 1) {
    return { badge: 'Tall', text: 'This photo is taller than it is wide, so the top and bottom will be cropped on cards and link previews.' }
  }
  if (purpose === 'page' && ratio < 1.5) {
    return {
      badge: ratio < 1 ? 'Tall' : 'Square',
      text: 'The About page shows images as a wide strip, so only the top part of this photo will show. Wide landscape photos work best.',
    }
  }
  if (purpose === 'product' && (ratio > 1.3 || ratio < 0.77)) {
    return {
      badge: ratio > 1 ? 'Wide' : 'Tall',
      text: `Product photos are shown square, so the ${ratio > 1 ? 'sides' : 'top and bottom'} of this photo will be cropped.`,
    }
  }
  return null
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

export function MediaLibraryDialog({
  current,
  onClose,
  onSelect,
  title = 'Choose a photo',
  multiple = false,
  purpose = 'cover',
  max = Infinity,
}: Props) {
  const currentSet = useMemo(() => new Set(Array.isArray(current) ? current : current ? [current] : []), [current])
  const [library, setLibrary] = useState<MediaLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  // Picked URLs in order; the last one is the one the footer describes
  const [selected, setSelected] = useState<string[]>([])
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
      page: items.filter((i) => i.usedIn.some((u) => u.kind === 'page')).length,
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

  const focused = selected[selected.length - 1] ?? null
  const selectedItem: MediaItem | undefined = focused ? library?.items.find((i) => i.url === focused) : undefined
  const selectedDims = focused ? dims[focused] : undefined
  const warning = cropWarning(purpose, selectedDims)
  // Products can't have the same photo twice, so photos already on it can't be picked again
  const lockCurrent = purpose === 'product'
  const full = multiple && selected.length >= max

  function pick(url: string) {
    if (lockCurrent && currentSet.has(url)) return
    if (!multiple) return setSelected([url])
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : prev.length >= max ? prev : [...prev, url]))
  }

  function confirm(urls = selected) {
    if (urls.length === 0) return
    onSelect(urls)
    onClose()
  }

  const verb = purpose === 'product' ? 'Add' : 'Insert'
  const confirmLabel = multiple ? (selected.length > 1 ? `${verb} ${selected.length} photos` : `${verb} photo`) : 'Use this photo'

  return createPortal(
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
            {FILTERS.filter((f) => f.value !== 'page' || counts.page > 0).map((f) => (
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
                  const order = selected.indexOf(item.url)
                  const isSelected = order !== -1
                  const isCurrent = currentSet.has(item.url)
                  const locked = (lockCurrent && isCurrent) || (full && !isSelected)
                  const tileWarning = cropWarning(purpose, dims[item.url])
                  const isBroken = !!broken[item.url]
                  return (
                    <li key={item.url}>
                      <button
                        type="button"
                        onClick={() => pick(item.url)}
                        onDoubleClick={multiple ? undefined : () => confirm([item.url])}
                        aria-pressed={isSelected}
                        aria-disabled={locked || undefined}
                        title={item.name}
                        className={`group relative block w-full aspect-[4/3] rounded-lg overflow-hidden bg-stone-800 ring-2 transition ${
                          isSelected
                            ? 'ring-[3px] ring-gold ring-offset-2 ring-offset-stone-900'
                            : locked
                              ? 'ring-transparent opacity-40 cursor-not-allowed'
                              : 'ring-transparent hover:ring-stone-500'
                        } focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
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
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded bg-forest/90 text-[10px] font-semibold text-white">{CURRENT_LABEL[purpose]}</span>
                          )}
                          {item.usedIn.length === 0 && <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-[10px] text-stone-300">Not used</span>}
                          {tileWarning && <span className="px-1.5 py-0.5 rounded bg-stone-900/80 text-[10px] text-amber-300">{tileWarning.badge}</span>}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center text-sm font-semibold" aria-hidden="true">
                            {multiple && selected.length > 1 ? order + 1 : '✓'}
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
                {multiple && selected.length > 1 && (
                  <p className="text-gold-light">{selected.length} photos selected. They’ll go in the order you picked them.</p>
                )}
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
                {warning && <p className="text-amber-300">{warning.text}</p>}
                {full && Number.isFinite(max) && <p className="text-stone-300">That’s the most you can add here. Unpick one to choose a different photo.</p>}
              </>
            ) : (
              <p>
                {!multiple
                  ? `Pick a photo. ${purpose === 'page' ? 'Wide landscape photos work best here.' : 'Landscape photos work best for covers.'}`
                  : Number.isFinite(max)
                    ? `Pick up to ${max} photo${max === 1 ? '' : 's'}. Click a photo again to unpick it.`
                    : 'Pick one or more photos. Click a photo again to unpick it.'}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-300 hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirm()}
              disabled={selected.length === 0}
              className="px-5 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
