'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { RichTextEditor } from './RichTextEditor'
import { AboutSection } from '@/types/supabase'

interface AboutPagesFormProps {
  sections: AboutSection[]
}

interface SectionState {
  id: string
  title: string
  body: string
  image_url: string | null
}

function sectionToState(s: AboutSection): SectionState {
  return {
    id: s.id,
    title: s.title,
    body: s.body,
    image_url: s.image_url,
  }
}

export function AboutPagesForm({ sections }: AboutPagesFormProps) {
  const [sectionStates, setSectionStates] = useState<SectionState[]>(
    () => sections.map(sectionToState)
  )
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sections.map((s) => [s.id, true]))
  )
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function updateSection(id: string, patch: Partial<SectionState>) {
    setSectionStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    )
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleImageUpload(sectionId: string, file: File) {
    setUploading((prev) => ({ ...prev, [sectionId]: true }))
    try {
      const supabase = createClient()
      const path = `about/${sectionId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        showToast('error', `Image upload failed: ${uploadError.message}`)
        return
      }

      const { data } = supabase.storage.from('content-images').getPublicUrl(path)
      updateSection(sectionId, { image_url: data.publicUrl })
    } catch {
      showToast('error', 'Image upload failed — please try again')
    } finally {
      setUploading((prev) => ({ ...prev, [sectionId]: false }))
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: sectionStates }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', (data as { error?: string }).error ?? 'Error saving sections')
          return
        }

        showToast('success', 'Saved')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  const SECTION_LABELS: Record<string, string> = {
    'founder-story': 'Founder Story',
    'brand-mission': 'Brand Mission',
    'why-loc-beads': 'Why Loc Beads',
    'contact': 'Contact',
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
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

      {/* Section editors */}
      {sectionStates.map((section) => {
        const isOpen = openSections[section.id] ?? true
        const label = SECTION_LABELS[section.id] ?? section.id

        return (
          <div
            key={section.id}
            className="rounded-lg border border-stone-700 bg-stone-900 overflow-hidden"
          >
            {/* Card header — toggle */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-800/50 transition-colors"
            >
              <span className="text-sm font-semibold text-stone-200">{label}</span>
              <svg
                className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Card body */}
            {isOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-stone-700">
                {/* Title */}
                <div className="space-y-1.5 pt-4">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Body
                  </label>
                  <RichTextEditor
                    value={section.body}
                    onChange={(html) => updateSection(section.id, { body: html })}
                  />
                </div>

                {/* Image upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Section Image
                  </label>

                  {/* Current image preview */}
                  {section.image_url && (
                    <div className="flex items-start gap-3">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-600 shrink-0">
                        <Image
                          src={section.image_url}
                          alt={`${label} image`}
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSection(section.id, { image_url: null })}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors mt-1"
                      >
                        Remove image
                      </button>
                    </div>
                  )}

                  {/* Upload input */}
                  <div className="relative">
                    <label
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm cursor-pointer transition-colors ${
                        uploading[section.id]
                          ? 'border-stone-700 text-stone-500 cursor-not-allowed'
                          : 'border-stone-600 text-stone-400 hover:border-gold/60 hover:text-stone-300'
                      }`}
                    >
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <span>
                        {uploading[section.id]
                          ? 'Uploading…'
                          : section.image_url
                          ? 'Replace image'
                          : 'Upload image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploading[section.id]}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(section.id, file)
                          // reset input so same file can be re-selected
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Save button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? 'Saving…' : 'Save all sections'}
        </button>
      </div>
    </div>
  )
}
