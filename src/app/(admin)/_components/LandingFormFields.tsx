'use client'

import { useId, useState, type ReactNode } from 'react'
import { hasPlaceholder, type LandingImage } from '@/lib/landing/config'
import { uploadFiles } from '@/lib/uploadthing'
import { PhotoPicker } from './PhotoPicker'

/**
 * Building blocks for Admin → Ad landing page. Every field gets id="field-<path>"
 * so the "needs sign-off" list at the top can link to it. Text still holding a
 * "[confirm" placeholder gets an amber ring until it's signed off.
 */

export const fieldId = (path: string) => `field-${path}`

const baseInput =
  'w-full px-3 py-2 bg-stone-800 border text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold'

function inputClass(opts: { error?: string; signOff?: boolean }) {
  if (opts.error) return `${baseInput} border-red-500`
  if (opts.signOff) return `${baseInput} border-amber-400 ring-2 ring-amber-400/60`
  return `${baseInput} border-stone-600`
}

export function SignOffNote() {
  return <p className="text-xs font-medium text-amber-300">Needs sign-off before ads run</p>
}

function FieldMessages({ path, help, error, signOff }: { path: string; help?: ReactNode; error?: string; signOff?: boolean }) {
  return (
    <>
      {signOff && <SignOffNote />}
      {error && (
        <p id={`${fieldId(path)}-error`} className="text-xs text-red-400">
          {error}
        </p>
      )}
      {help && <p className="text-xs text-stone-500">{help}</p>}
    </>
  )
}

export function Section({ id, step, title, intro, children }: { id: string; step?: number; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-5 rounded-xl bg-stone-900 p-5 ring-1 ring-stone-800 sm:p-6">
      <div>
        <h2 id={`${id}-title`} className="font-heading text-lg font-semibold text-white">
          {step !== undefined && <span className="mr-2 text-gold-light">{step}.</span>}
          {title}
        </h2>
        {intro && <div className="mt-1 space-y-1 text-sm text-stone-400">{intro}</div>}
      </div>
      {children}
    </section>
  )
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{children}</p>
      <div className="mt-2 border-t border-stone-700" />
    </div>
  )
}

interface TextFieldProps {
  path: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  help?: ReactNode
  error?: string
  placeholder?: string
  rows?: number
}

export function TextField({ path, label, value, onChange, maxLength, help, error, placeholder, rows }: TextFieldProps) {
  const signOff = hasPlaceholder(value)
  const shared = {
    id: fieldId(path),
    value,
    maxLength,
    placeholder,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${fieldId(path)}-error` : undefined,
    className: `${inputClass({ error, signOff })}${rows ? ' resize-y' : ''}`,
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(path)} className="block text-sm font-medium text-stone-300">
        {label}
      </label>
      {rows ? (
        <textarea {...shared} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      <FieldMessages path={path} help={help} error={error} signOff={signOff} />
    </div>
  )
}

interface NumberFieldProps {
  path: string
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  prefix?: string
  help?: ReactNode
  error?: string
}

export function NumberField({ path, label, value, onChange, min, max, step = 1, prefix, help, error }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(path)} className="block text-sm font-medium text-stone-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-stone-400">{prefix}</span>}
        <input
          id={fieldId(path)}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId(path)}-error` : undefined}
          className={`${inputClass({ error })} max-w-40`}
        />
      </div>
      <FieldMessages path={path} help={help} error={error} />
    </div>
  )
}

export function ToggleField({ path, label, help, checked, onChange }: { path: string; label: string; help?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={fieldId(path)} className="flex cursor-pointer items-start gap-3">
      <input id={fieldId(path)} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-gold" />
      <span>
        <span className="block text-sm text-stone-200">{label}</span>
        {help && <span className="block text-xs text-stone-500">{help}</span>}
      </span>
    </label>
  )
}

interface SelectFieldProps {
  path: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  help?: ReactNode
}

export function SelectField({ path, label, value, onChange, options, error, help }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(path)} className="block text-sm font-medium text-stone-300">
        {label}
      </label>
      <select
        id={fieldId(path)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId(path)}-error` : undefined}
        className={inputClass({ error })}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldMessages path={path} help={help} error={error} />
    </div>
  )
}

interface ImageFieldProps {
  /** Path of the image, e.g. "hero.image"; the description is "<path>.alt" */
  path: string
  label: string
  help?: ReactNode
  value: LandingImage | null
  onChange: (value: LandingImage | null) => void
  altError?: string
  purpose?: 'product' | 'body'
  previewClass?: string
}

/** A photo plus its description (alt text), which screen readers and Google use */
/** Bigger than this and the hero slows the page down on phones */
const VIDEO_MAX_BYTES = 1.5 * 1024 * 1024

interface VideoFieldProps {
  path: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  help?: ReactNode
  error?: string
  placeholder?: string
}

/** A hero video: upload an MP4 (kept under 1.5 MB) or paste an https link, with a small preview */
export function VideoField({ path, label, value, onChange, help, error, placeholder }: VideoFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputId = useId()

  async function handleFile(file: File) {
    setUploadError(null)
    if (file.type !== 'video/mp4') return setUploadError('Please choose an MP4 video.')
    if (file.size > VIDEO_MAX_BYTES) {
      return setUploadError(`That video is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep it under 1.5 MB (shorter, or exported smaller) so the page loads fast.`)
    }
    setUploading(true)
    try {
      const [uploaded] = await uploadFiles('landingVideos', { files: [file] })
      if (uploaded?.ufsUrl) onChange(uploaded.ufsUrl)
      else setUploadError('Upload failed, please try again')
    } catch (err) {
      setUploadError(`Upload failed: ${err instanceof Error ? err.message : 'please try again'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <TextField
        path={path}
        label={label}
        value={value ?? ''}
        onChange={(v) => onChange(v.trim() ? v : null)}
        maxLength={1000}
        placeholder={placeholder}
        error={error}
        help={help}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-stone-600 px-3 text-sm text-stone-200 hover:border-gold ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {uploading ? 'Uploading video…' : value ? 'Replace video' : 'Upload a video'}
        </label>
        <input
          id={inputId}
          type="file"
          accept="video/mp4"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
        {value && !uploading && (
          <button type="button" onClick={() => onChange(null)} className="text-sm text-stone-400 underline hover:text-white">
            Remove video
          </button>
        )}
      </div>
      {uploadError && (
        <p role="alert" className="text-xs text-red-400">
          {uploadError}
        </p>
      )}
      {value && /^https:\/\//.test(value) && (
        <video src={value} muted loop playsInline autoPlay preload="metadata" className="h-32 w-auto rounded-lg border border-stone-600 bg-stone-900" />
      )}
    </div>
  )
}

export function ImageField({ path, label, help, value, onChange, altError, purpose = 'body', previewClass }: ImageFieldProps) {
  return (
    <div className="space-y-2" id={fieldId(path)}>
      <p className="text-sm font-medium text-stone-300">{label}</p>
      <PhotoPicker
        url={value?.url ?? null}
        onChange={(url) => onChange(url ? { url, alt: value?.alt ?? '' } : null)}
        libraryTitle={`Choose a photo: ${label}`}
        purpose={purpose}
        previewClass={previewClass}
      />
      {help && <p className="text-xs text-stone-500">{help}</p>}
      {value && (
        <TextField
          path={`${path}.alt`}
          label="Describe the photo"
          value={value.alt}
          onChange={(alt) => onChange({ ...value, alt })}
          maxLength={200}
          placeholder="e.g. Gold Twinkles on shoulder-length locs"
          help="A few words about what's in the photo, for people using screen readers and for Google."
          error={altError}
        />
      )}
    </div>
  )
}
