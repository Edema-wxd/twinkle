'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY, hasPlaceholder } from '@/lib/landing/config'
import { Section, SignOffNote } from './LandingFormFields'

export type LandingFaqRow = { id: string; question: string; needsSignOff: boolean }

/**
 * The landing page's FAQ list. The questions themselves live in Admin → FAQs
 * under the "Landing page" category (edited with the usual FAQ form); this
 * panel lists them and can copy in the draft questions to start from.
 */
export function LandingFaqsPanel({ faqs }: { faqs: LandingFaqRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const addHref = `/admin/faqs?category=${encodeURIComponent(LANDING_FAQ_CATEGORY)}`

  function addDrafts() {
    setMessage(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/landing-page/faqs', { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setMessage({ type: 'error', text: data.error ?? 'Could not add the draft FAQs. Please try again.' })
          return
        }
        setMessage({ type: 'success', text: 'Draft FAQs added. Edit each one to replace the [confirm] notes.' })
        router.refresh()
      } catch {
        setMessage({ type: 'error', text: 'Network error, please try again.' })
      }
    })
  }

  const draftsNeedingSignOff = DEFAULT_LANDING_FAQS.filter((f) => hasPlaceholder(f.question) || hasPlaceholder(f.answer)).length

  return (
    <Section
      id="landing-faqs"
      step={8}
      title="FAQs"
      intro={
        <>
          <p>
            The landing page shows the questions in Admin &rarr; FAQs with the category &ldquo;{LANDING_FAQ_CATEGORY}&rdquo;, in their FAQ order. They
            don&rsquo;t appear on the main /faq page. FAQs save on their own, separately from the Save button below.
          </p>
        </>
      }
    >
      {faqs.length === 0 ? (
        <div className="space-y-3 rounded-lg bg-stone-800/50 p-4 ring-1 ring-stone-700">
          <p className="text-sm text-stone-300">
            There are no landing page FAQs yet, so the page shows the {DEFAULT_LANDING_FAQS.length} draft answers from the build plan
            {draftsNeedingSignOff > 0 && <> ({draftsNeedingSignOff} of them still need sign-off)</>}. Add them here to edit, reorder or remove them.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addDrafts}
              disabled={isPending}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-deep disabled:opacity-50"
            >
              {isPending ? 'Adding…' : 'Add the draft FAQs'}
            </button>
            <Link href={addHref} className="text-sm text-stone-300 underline hover:text-white">
              Or write your own instead
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-stone-700/60 overflow-hidden rounded-lg ring-1 ring-stone-700">
            {faqs.map((f, i) => (
              <li key={f.id} className="flex items-start gap-3 bg-stone-800/40 px-4 py-3">
                <span className="w-5 shrink-0 text-sm text-stone-500">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-stone-200">{f.question}</p>
                  {f.needsSignOff && <SignOffNote />}
                </div>
                <Link href={`/admin/faqs/${f.id}`} className="shrink-0 rounded-md bg-stone-700 px-3 py-1 text-xs text-stone-200 hover:bg-stone-600">
                  Edit
                </Link>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={addHref} className="text-sm font-medium text-gold-light hover:text-white">
              + Add a question
            </Link>
            <Link href="/admin/faqs" className="text-sm text-stone-400 underline hover:text-white">
              Change the order in Admin &rarr; FAQs
            </Link>
          </div>
        </>
      )}

      <div aria-live="polite">
        {message && <p className={`text-sm ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
      </div>
    </Section>
  )
}
