'use client'

import { useEffect, useRef, useState } from 'react'
import { useUploadThing } from '@/lib/uploadthing'
import { markdownToArticle, rehostViaApi, type MarkdownImportResult } from '@/lib/markdown-import'
import { useDialogFocus } from '@/lib/useDialogFocus'

interface Props {
  hasContent: boolean
  onClose: () => void
  onImported: (result: MarkdownImportResult, mode: 'replace' | 'append') => void
}

const MD_RE = /\.(md|markdown|mdown|txt)$/i

export function MarkdownImportDialog({ hasContent, onClose, onImported }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useDialogFocus(panelRef, true)

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [mode, setMode] = useState<'replace' | 'append'>(hasContent ? 'append' : 'replace')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { startUpload } = useUploadThing('blogImages', {
    onUploadError: (err) => setError(`Image upload failed: ${err.message}`),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  // Which relative images does the Markdown reference, and which did we get?
  const referenced = Array.from(text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g))
    .map((m) => m[1])
    .filter((src) => !/^(https?:|data:)/i.test(src))
    .map((src) => decodeURIComponent(src).split(/[\\/]/).pop()!.toLowerCase())
  const have = new Set(images.map((f) => f.name.toLowerCase()))
  const missing = [...new Set(referenced)].filter((n) => !have.has(n))
  const remoteCount = (text.match(/!\[[^\]]*\]\(\s*<?https?:/g) ?? []).length

  async function addFiles(list: FileList | File[]) {
    setError(null)
    const files = Array.from(list)
    const md = files.find((f) => MD_RE.test(f.name))
    if (md) {
      setText(await md.text())
      setFileName(md.name)
    }
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    if (imgs.length) {
      setImages((prev) => {
        const byName = new Map(prev.map((f) => [f.name.toLowerCase(), f]))
        for (const f of imgs) byName.set(f.name.toLowerCase(), f)
        return [...byName.values()]
      })
    }
    if (!md && imgs.length === 0) setError('Choose a .md file and/or the images it uses.')
  }

  async function runImport() {
    if (!text.trim()) {
      setError('Add a Markdown file or paste some Markdown first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await markdownToArticle(text, {
        files: images,
        uploadLocal: async (file) => (await startUpload([file]))?.[0]?.ufsUrl ?? null,
        rehostRemote: rehostViaApi,
      })
      if (!result.html.trim()) {
        setError('That file has no content after the title.')
        return
      }
      onImported(result, mode)
    } catch (err) {
      setError(`Couldn't import: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-import-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-stone-900 ring-1 ring-stone-700 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id="md-import-title" className="font-heading text-lg font-semibold text-white">Import Markdown</h2>
            <p className="mt-1 text-sm text-stone-400">
              Bring in a post written in Notion, Google Docs, Obsidian or any Markdown editor. Headings, bold, links, lists, quotes, tables and images come across.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-stone-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void addFiles(e.dataTransfer.files)
            }}
            className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? 'border-gold bg-gold/10' : 'border-stone-600'}`}
          >
            <p className="text-sm text-stone-200">
              Drop your <strong>.md</strong> file here, together with its images
            </p>
            <p className="mt-1 text-xs text-stone-500">Images referenced by file name (e.g. <code>images/beads.jpg</code>) are matched and uploaded automatically.</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 px-4 py-2 rounded-lg bg-stone-800 ring-1 ring-stone-600 hover:ring-stone-400 text-sm text-stone-100"
            >
              Choose files…
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {(fileName || images.length > 0) && (
              <p className="mt-3 text-xs text-stone-400">
                {fileName && <span className="text-stone-200">{fileName}</span>}
                {fileName && images.length > 0 && ' + '}
                {images.length > 0 && `${images.length} image${images.length === 1 ? '' : 's'}`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="md-text" className="block text-sm font-medium text-stone-300">…or paste Markdown</label>
            <textarea
              id="md-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setFileName(null)
              }}
              rows={9}
              spellCheck={false}
              placeholder={'---\ntitle: How to bead your locs at home\ndescription: A 5-minute routine\ncategory: Tutorials\ncover: images/cover.jpg\n---\n\n## What you need\n\n| Bead size | Best for |\n|---|---|\n| 4mm | Microlocs |\n| 6mm | Traditional locs |\n\n![Gold beads](images/gold.jpg)'}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-gold resize-y"
            />
            <p className="text-xs text-stone-500">
              Optional front matter at the top sets the title, teaser (<code>description</code>), <code>category</code>, <code>slug</code> and <code>cover</code>.
              Without it, the first <code># Heading</code> becomes the title.
            </p>
          </div>

          {(missing.length > 0 || remoteCount > 0) && (
            <ul className="space-y-1 text-xs">
              {remoteCount > 0 && (
                <li className="text-stone-400">
                  {remoteCount} online image{remoteCount === 1 ? '' : 's'} will be copied to Twinkle Locs storage so {remoteCount === 1 ? 'it keeps' : 'they keep'} working.
                </li>
              )}
              {missing.length > 0 && (
                <li className="text-amber-300">
                  Missing image file{missing.length === 1 ? '' : 's'}: {missing.slice(0, 6).join(', ')}
                  {missing.length > 6 ? ` and ${missing.length - 6} more` : ''}. Add {missing.length === 1 ? 'it' : 'them'} above, or {missing.length === 1 ? 'it' : 'they'}&apos;ll be skipped.
                </li>
              )}
            </ul>
          )}

          {hasContent && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-stone-300 mb-1">This post already has content</legend>
              {(
                [
                  ['append', 'Add to the end', 'Keeps what you wrote; fills empty fields like the teaser.'],
                  ['replace', 'Replace the post', 'Overwrites the story, title, teaser, category and cover.'],
                ] as const
              ).map(([value, label, hint]) => (
                <label key={value} className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="md-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1 accent-gold" />
                  <span>
                    <span className="block text-sm text-stone-200">{label}</span>
                    <span className="block text-xs text-stone-500">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-stone-800 bg-stone-900">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-sm text-stone-300 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={busy || !text.trim()}
            className="px-5 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {busy ? 'Importing and uploading images…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
