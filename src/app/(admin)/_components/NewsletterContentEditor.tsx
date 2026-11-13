'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { RichTextEditor } from './RichTextEditor'
import { MediaLibraryDialog } from './MediaLibraryDialog'
import { useUploadThing } from '@/lib/uploadthing'
import { renderNewsletter, UNSUBSCRIBE_PLACEHOLDER, type NewsletterContent } from '@/lib/newsletter/template'

/** The editable parts of a newsletter-style email (used for newsletters and the welcome email). */
export type Draft = { subject: string; preheader: string; heroImageUrl: string | null; bodyHtml: string; ctaLabel: string; ctaUrl: string }

export const EMPTY_DRAFT: Draft = { subject: '', preheader: '', heroImageUrl: null, bodyHtml: '', ctaLabel: 'Shop the collection', ctaUrl: '/catalog' }

export const inputClass =
  'w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold'

export const toContent = (d: Draft): NewsletterContent => ({
  subject: d.subject,
  preheader: d.preheader,
  heroImageUrl: d.heroImageUrl,
  bodyHtml: d.bodyHtml,
  ctaLabel: d.ctaLabel || undefined,
  ctaUrl: d.ctaUrl || undefined,
})

export const fromContent = (c: Partial<NewsletterContent>): Draft => ({
  subject: c.subject ?? '',
  preheader: c.preheader ?? '',
  heroImageUrl: c.heroImageUrl ?? null,
  bodyHtml: c.bodyHtml ?? '',
  ctaLabel: c.ctaLabel ?? '',
  ctaUrl: c.ctaUrl ?? '',
})

/** What's missing before it can be sent (shown as hints, and disables the send buttons). */
export function contentProblems(d: Draft): string[] {
  return [
    !d.subject.trim() && 'Add a subject line.',
    !d.bodyHtml.replace(/<[^>]+>/g, '').trim() && 'Write the message.',
    d.ctaLabel.trim() && !d.ctaUrl.trim() && 'Add a link for the button, or clear the button text.',
  ].filter(Boolean) as string[]
}

/**
 * Subject, preview text, photo, message and button. The rich-text editor is
 * uncontrolled after mount: change `editorKey` to load a different body.
 */
export function NewsletterFields({
  draft,
  onChange,
  editorKey,
  idPrefix,
  onError,
}: {
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  editorKey: number
  idPrefix: string
  onError: (message: string) => void
}) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { startUpload } = useUploadThing('contentImages', {
    onClientUploadComplete: (res) => {
      if (res?.[0]) onChange({ heroImageUrl: res[0].ufsUrl })
    },
    onUploadError: (err) => onError(`Upload failed: ${err.message}`),
  })
  const problems = contentProblems(draft)

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-subject`} className="block text-sm font-medium text-stone-200 mb-1">
          Subject
        </label>
        <input id={`${idPrefix}-subject`} className={inputClass} value={draft.subject} maxLength={150} onChange={(e) => onChange({ subject: e.target.value })} placeholder="New gold beads just dropped, {name}" />
        <p className="mt-1 text-xs text-stone-500">Type {'{name}'} to use each subscriber&apos;s first name.</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-preheader`} className="block text-sm font-medium text-stone-200 mb-1">
          Preview text <span className="text-stone-500 font-normal">(optional)</span>
        </label>
        <input id={`${idPrefix}-preheader`} className={inputClass} value={draft.preheader} maxLength={200} onChange={(e) => onChange({ preheader: e.target.value })} placeholder="Shown after the subject in the inbox" />
      </div>

      <div>
        <p className="text-sm font-medium text-stone-200 mb-2">
          Photo at the top <span className="text-stone-500 font-normal">(optional)</span>
        </p>
        {draft.heroImageUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-32 overflow-hidden rounded-lg ring-1 ring-stone-600 bg-stone-800">
              <Image src={draft.heroImageUrl} alt="" fill className="object-cover" sizes="128px" unoptimized />
            </div>
            <div className="flex flex-col items-start gap-1 text-sm">
              <button type="button" onClick={() => setLibraryOpen(true)} className="text-stone-300 hover:text-white">
                Change
              </button>
              <button type="button" onClick={() => onChange({ heroImageUrl: null })} className="text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLibraryOpen(true)} className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-sm text-stone-200">
              Choose from uploaded photos
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-sm text-stone-200 disabled:opacity-60">
              {uploading ? 'Uploading…' : 'Upload a photo'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setUploading(true)
                try {
                  await startUpload([f])
                } finally {
                  setUploading(false)
                  e.target.value = ''
                }
              }}
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-stone-200 mb-1">Message</p>
        <RichTextEditor key={editorKey} value={draft.bodyHtml} onChange={(html) => onChange({ bodyHtml: html })} variant="faq" placeholder="Hi {name}, …" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-cta`} className="block text-sm font-medium text-stone-200 mb-1">
            Button text <span className="text-stone-500 font-normal">(optional)</span>
          </label>
          <input id={`${idPrefix}-cta`} className={inputClass} value={draft.ctaLabel} maxLength={60} onChange={(e) => onChange({ ctaLabel: e.target.value })} placeholder="Shop the collection" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-cta-url`} className="block text-sm font-medium text-stone-200 mb-1">
            Button link
          </label>
          <input id={`${idPrefix}-cta-url`} className={inputClass} value={draft.ctaUrl} maxLength={500} onChange={(e) => onChange({ ctaUrl: e.target.value })} placeholder="/catalog or /catalog/gold-twinkles" />
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="text-xs text-amber-200 space-y-0.5">
          {problems.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      )}

      {libraryOpen && (
        <MediaLibraryDialog
          title="Choose a photo for the email"
          current={draft.heroImageUrl}
          onClose={() => setLibraryOpen(false)}
          onSelect={([url]) => onChange({ heroImageUrl: url })}
        />
      )}
    </div>
  )
}

/** Exactly what a subscriber receives (personalised with `firstName`). */
export function NewsletterPreview({ draft, firstName }: { draft: Draft; firstName: string }) {
  const html = useMemo(() => {
    const { html } = renderNewsletter(
      toContent({ ...draft, subject: draft.subject || 'Your subject line', bodyHtml: draft.bodyHtml || '<p>Start writing…</p>' }),
      firstName,
    )
    return html.split(UNSUBSCRIBE_PLACEHOLDER).join('#')
  }, [draft, firstName])
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-200">
        Preview <span className="text-stone-500 font-normal">(as {firstName} sees it)</span>
      </p>
      <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[720px] w-full rounded-xl bg-[#E8E0D0] ring-1 ring-stone-700" />
    </div>
  )
}
