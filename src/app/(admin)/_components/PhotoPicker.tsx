'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import { uploadFiles } from '@/lib/uploadthing'
import { MediaLibraryDialog } from './MediaLibraryDialog'

interface PhotoPickerProps {
  /** Current photo URL, or null */
  url: string | null
  onChange: (url: string | null) => void
  /** Title of the "Choose from uploaded photos" dialog */
  libraryTitle: string
  /** Decides the crop warning in the photo library ('product' = shown square) */
  purpose?: 'product' | 'body' | 'cover' | 'page'
  /** Tailwind classes for the preview box (sets its shape) */
  previewClass?: string
  disabled?: boolean
}

/**
 * One photo: upload a new one (UploadThing) or reuse one already uploaded,
 * with a preview and a remove button. Used by the ad landing page and reviews.
 */
export function PhotoPicker({ url, onChange, libraryTitle, purpose = 'body', previewClass = 'w-24 h-24', disabled }: PhotoPickerProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const inputId = useId()

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const [uploaded] = await uploadFiles('contentImages', { files: [file] })
      if (uploaded?.ufsUrl) onChange(uploaded.ufsUrl)
      else setError('Upload failed, please try again')
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'please try again'}`)
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || disabled

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        <div className={`relative shrink-0 overflow-hidden rounded-lg border border-stone-600 bg-stone-800 ${previewClass}`}>
          {url ? (
            <Image src={url} alt="" fill className="object-cover" sizes="160px" unoptimized />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-stone-500">No photo</span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-stone-900/70 text-xs text-stone-200">Uploading…</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className={`inline-flex items-center justify-center rounded-lg border border-dashed px-3 py-2 text-sm transition-colors ${
              busy ? 'cursor-not-allowed border-stone-700 text-stone-500' : 'cursor-pointer border-stone-600 text-stone-300 hover:border-gold/60 hover:text-white'
            }`}
          >
            {uploading ? 'Uploading…' : url ? 'Upload a different photo' : 'Upload a photo'}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            disabled={busy}
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 transition-colors hover:bg-stone-700 disabled:opacity-60"
          >
            Choose from uploaded photos
          </button>
          {url && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="self-start text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-60"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {libraryOpen && (
        <MediaLibraryDialog
          title={libraryTitle}
          purpose={purpose}
          current={url}
          onClose={() => setLibraryOpen(false)}
          onSelect={([picked]) => {
            if (picked) onChange(picked)
          }}
        />
      )}
    </div>
  )
}
