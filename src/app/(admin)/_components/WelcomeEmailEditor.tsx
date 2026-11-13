'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_WELCOME, type WelcomeSettings } from '@/lib/newsletter/welcomeDefault'
import { contentProblems, fromContent, NewsletterFields, NewsletterPreview, toContent, type Draft } from './NewsletterContentEditor'

export type { WelcomeSettings }

/** Admin → Newsletter → Welcome email: edit, switch on/off, test. */
export function WelcomeEmailEditor({
  initial,
  adminEmail,
  emailReady,
  previewName,
}: {
  initial: WelcomeSettings
  adminEmail: string
  emailReady: boolean
  previewName: string
}) {
  const router = useRouter()
  const [saved, setSaved] = useState<{ enabled: boolean; draft: Draft }>({ enabled: initial.enabled, draft: fromContent(initial.content) })
  const [enabled, setEnabled] = useState(initial.enabled)
  const [draft, setDraft] = useState<Draft>(() => fromContent(initial.content))
  const [editorKey, setEditorKey] = useState(0)
  const [busy, setBusy] = useState<null | 'save' | 'test'>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const problems = contentProblems(draft)
  const dirty = enabled !== saved.enabled || JSON.stringify(draft) !== JSON.stringify(saved.draft)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  async function save() {
    setBusy('save')
    setNotice(null)
    try {
      const res = await fetch('/api/admin/newsletter/welcome', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, content: toContent(draft) }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<WelcomeSettings> & { error?: string }
      if (!res.ok) {
        setNotice({ tone: 'error', text: data.error ?? 'Couldn’t save. Please try again.' })
        return
      }
      setSaved({ enabled, draft })
      router.refresh() // updates the tab label ("Welcome email (off)")
      setNotice({ tone: 'ok', text: enabled ? 'Saved. New subscribers will get this email.' : 'Saved. The welcome email is switched off.' })
    } catch {
      setNotice({ tone: 'error', text: 'Couldn’t reach the server. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function sendTest() {
    setBusy('test')
    setNotice(null)
    try {
      const res = await fetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toContent(draft)),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string }
      setNotice(res.ok ? { tone: 'ok', text: `Test sent to ${data.to}.` } : { tone: 'error', text: data.error ?? 'The test didn’t send.' })
    } catch {
      setNotice({ tone: 'error', text: 'Couldn’t reach the server. Check your connection and try again.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-5">
        <div className="rounded-xl bg-stone-900 ring-1 ring-stone-800 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-gold" />
            <span>
              <span className="block text-sm font-medium text-white">Send this to everyone who joins the newsletter</span>
              <span className="block text-xs text-stone-400 mt-0.5">
                Sent straight after they sign up, once per email address, with an unsubscribe link. People already on the list don&apos;t get it.
              </span>
            </span>
          </label>
        </div>

        <NewsletterFields draft={draft} onChange={set} editorKey={editorKey} idPrefix="welcome" onError={(m) => setNotice({ tone: 'error', text: m })} />

        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-4 py-3 text-sm ${notice.tone === 'error' ? 'border border-red-800 bg-red-950/60 text-red-200' : 'border border-emerald-800 bg-emerald-950/50 text-emerald-200'}`}
          >
            {notice.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-800 pt-5">
          <button type="button" onClick={save} disabled={busy !== null || problems.length > 0 || !dirty} className="px-5 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {busy === 'save' ? 'Saving…' : dirty ? 'Save welcome email' : 'Saved'}
          </button>
          <button type="button" onClick={sendTest} disabled={busy !== null || problems.length > 0 || !emailReady} className="px-4 py-2 text-sm text-stone-200 border border-stone-600 rounded-lg hover:border-stone-400 disabled:opacity-50">
            {busy === 'test' ? 'Sending test…' : `Send a test to ${adminEmail}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(fromContent(DEFAULT_WELCOME.content))
              setEditorKey((k) => k + 1)
            }}
            className="ml-auto text-sm text-stone-500 hover:text-stone-300"
          >
            Reset to the default wording
          </button>
        </div>
      </div>

      <NewsletterPreview draft={draft} firstName={previewName} />
    </div>
  )
}
