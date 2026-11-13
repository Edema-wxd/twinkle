'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignSummary } from '@/lib/newsletter/campaign'
import { contentProblems, EMPTY_DRAFT as EMPTY, inputClass, NewsletterFields, NewsletterPreview, toContent, type Draft } from './NewsletterContentEditor'
import { WelcomeEmailEditor, type WelcomeSettings } from './WelcomeEmailEditor'

export type SubscriberRow = { id: string; firstName: string; email: string; sourcePage: string | null; subscribedAt: string }

type Tab = 'write' | 'welcome' | 'subscribers' | 'sent'
type Progress = { total: number; sent: number; failed: number; remaining: number }
/** A send that's under way (kept in this browser so it can be resumed if the tab closes) */
type ActiveSend = { campaignId: string; content: Draft; progress: Progress | null }

const DRAFT_KEY = 'twinkle:newsletter-draft'
const ACTIVE_KEY = 'twinkle:newsletter-active'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked: drafts just won't persist
  }
}

export function NewsletterManager({
  subscribers,
  loadFailed,
  history,
  adminEmail,
  emailReady,
  welcome,
}: {
  subscribers: SubscriberRow[]
  loadFailed: boolean
  history: CampaignSummary[]
  adminEmail: string
  emailReady: boolean
  welcome: WelcomeSettings
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('write')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [hydrated, setHydrated] = useState(false)
  // The editor is uncontrolled after mount; bump this to load a different body into it
  const [editorKey, setEditorKey] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [active, setActive] = useState<ActiveSend | null>(null)
  const [sending, setSending] = useState(false)
  const stopRef = useRef(false)

  // Restore the draft and any interrupted send after mount (localStorage isn't available on the server)
  useEffect(() => {
    const d = load<Draft>(DRAFT_KEY)
    if (d) {
      setDraft({ ...EMPTY, ...d })
      setEditorKey((k) => k + 1)
    }
    setActive(load<ActiveSend>(ACTIVE_KEY))
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (hydrated) save(DRAFT_KEY, draft)
  }, [draft, hydrated])
  useEffect(() => {
    if (hydrated) save(ACTIVE_KEY, active)
  }, [active, hydrated])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const flash = (tone: 'ok' | 'error', text: string) => setNotice({ tone, text })

  const problems = contentProblems(draft)

  async function sendTest() {
    setTesting(true)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toContent(draft)),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string }
      if (!res.ok) flash('error', data.error ?? 'The test didn’t send.')
      else flash('ok', `Test sent to ${data.to}. Check it on your phone before sending to everyone.`)
    } catch {
      flash('error', 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setTesting(false)
    }
  }

  /** Send batch after batch until nobody's left (or Stop is pressed / an error stops it). */
  const run = useCallback(
    async (send: ActiveSend, retryFailed = false) => {
      setSending(true)
      setNotice(null)
      stopRef.current = false
      let current = send
      try {
        for (;;) {
          const res = await fetch('/api/admin/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: current.campaignId, content: toContent(current.content), retryFailed }),
          })
          const data = (await res.json().catch(() => ({}))) as Partial<Progress> & { error?: string; batchSent?: number; batchFailed?: number }
          if (!res.ok) {
            flash('error', data.error ?? 'Sending stopped. Press Resume to carry on; nobody gets it twice.')
            break
          }
          const progress: Progress = { total: data.total ?? 0, sent: data.sent ?? 0, failed: data.failed ?? 0, remaining: data.remaining ?? 0 }
          current = { ...current, progress }
          setActive(current)
          // A retry pass stops once a batch gets nobody new through (addresses that keep failing, e.g. a dead mailbox)
          const pending = retryFailed ? progress.failed > 0 && (data.batchSent ?? 0) > 0 : progress.remaining > 0
          if (!pending) {
            if (progress.failed === 0) {
              flash('ok', `Sent to all ${progress.sent} subscribers.`)
              setActive(null)
            } else {
              flash('error', `Sent to ${progress.sent}. ${progress.failed} couldn’t be sent; you can retry them below.`)
            }
            router.refresh()
            break
          }
          if (stopRef.current) {
            flash('ok', `Paused after ${progress.sent} of ${progress.total}. Press Resume to carry on.`)
            break
          }
        }
      } catch {
        flash('error', 'Lost connection while sending. Press Resume to carry on; nobody gets it twice.')
      } finally {
        setSending(false)
      }
    },
    [router],
  )

  function startSend() {
    setConfirming(false)
    const send: ActiveSend = { campaignId: crypto.randomUUID(), content: draft, progress: null }
    setActive(send)
    void run(send)
  }

  async function removeSubscriber(id: string) {
    const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) {
      flash('error', 'Couldn’t remove them. Please try again.')
      return
    }
    flash('ok', 'Removed from the newsletter.')
    router.refresh()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'write', label: 'Write' },
    { id: 'welcome', label: `Welcome email${welcome.enabled ? '' : ' (off)'}` },
    { id: 'subscribers', label: `Subscribers (${subscribers.length})` },
    { id: 'sent', label: `Sent (${history.length})` },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Newsletter</h1>
        <p className="text-stone-400 text-sm">
          {subscribers.length} {subscribers.length === 1 ? 'subscriber' : 'subscribers'}. Every email includes an unsubscribe link.
        </p>
      </div>

      {!emailReady && (
        <p role="alert" className="rounded-lg border border-amber-700 bg-amber-950/50 px-4 py-3 text-sm text-amber-100">
          Email isn&apos;t set up yet, so nothing can be sent. See Admin → Emails.
        </p>
      )}
      {loadFailed && (
        <p role="alert" className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          Couldn&apos;t load subscribers. Refresh the page to try again.
        </p>
      )}

      {/* Interrupted or in-progress send */}
      {active && (
        <section aria-label="Sending progress" className="rounded-xl bg-stone-900 ring-1 ring-gold/40 p-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-heading text-sm font-semibold text-white">
              {sending ? 'Sending' : 'Not finished'}: “{active.content.subject}”
            </p>
            {active.progress && (
              <p className="text-sm text-stone-300 tabular-nums">
                {active.progress.sent} of {active.progress.total} sent
                {active.progress.failed > 0 && <span className="text-red-300"> · {active.progress.failed} failed</span>}
              </p>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Newsletter sending progress"
            aria-valuemin={0}
            aria-valuemax={active.progress?.total ?? 1}
            aria-valuenow={active.progress?.sent ?? 0}
            className="h-2 overflow-hidden rounded-full bg-stone-800"
          >
            <div
              className="h-full bg-gold transition-[width] duration-500"
              style={{ width: `${active.progress && active.progress.total ? (active.progress.sent / active.progress.total) * 100 : 3}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {sending ? (
              <button type="button" onClick={() => (stopRef.current = true)} className="px-4 py-2 text-sm text-stone-200 border border-stone-600 rounded-lg hover:border-stone-400">
                Pause
              </button>
            ) : (
              <>
                {(active.progress?.remaining ?? 1) > 0 && (
                  <button type="button" onClick={() => run(active)} disabled={!emailReady} className="px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    Resume
                  </button>
                )}
                {(active.progress?.failed ?? 0) > 0 && (active.progress?.remaining ?? 0) === 0 && (
                  <button type="button" onClick={() => run(active, true)} className="px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg">
                    Retry {active.progress?.failed} failed
                  </button>
                )}
                <button type="button" onClick={() => setActive(null)} className="px-4 py-2 text-sm text-stone-400 hover:text-white">
                  Dismiss
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-4 py-3 text-sm ${notice.tone === 'error' ? 'border border-red-800 bg-red-950/60 text-red-200' : 'border border-emerald-800 bg-emerald-950/50 text-emerald-200'}`}
        >
          {notice.text}
        </p>
      )}

      <div role="tablist" aria-label="Newsletter" className="flex gap-1 border-b border-stone-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-gold text-white' : 'border-transparent text-stone-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'write' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-5">
            <NewsletterFields draft={draft} onChange={set} editorKey={editorKey} idPrefix="nl" onError={(m) => flash('error', m)} />

            <div className="flex flex-wrap items-center gap-3 border-t border-stone-800 pt-5">
              <button type="button" onClick={sendTest} disabled={testing || problems.length > 0 || !emailReady} className="px-4 py-2 text-sm text-stone-200 border border-stone-600 rounded-lg hover:border-stone-400 disabled:opacity-50">
                {testing ? 'Sending test…' : `Send a test to ${adminEmail}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={problems.length > 0 || !emailReady || sending || subscribers.length === 0}
                className="px-5 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                Send to {subscribers.length} {subscribers.length === 1 ? 'subscriber' : 'subscribers'}…
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY)
                  setEditorKey((k) => k + 1)
                }}
                className="ml-auto text-sm text-stone-500 hover:text-stone-300"
              >
                Start over
              </button>
            </div>

            {confirming && (
              <div role="alertdialog" aria-labelledby="nl-confirm-title" className="rounded-xl border border-gold/50 bg-stone-900 p-4 space-y-3">
                <p id="nl-confirm-title" className="font-heading text-sm font-semibold text-white">
                  Send “{draft.subject}” to {subscribers.length} {subscribers.length === 1 ? 'person' : 'people'}?
                </p>
                <p className="text-sm text-stone-400">This can&apos;t be undone. Sending a test to yourself first is a good idea.</p>
                <div className="flex gap-2">
                  <button type="button" autoFocus onClick={startSend} className="px-4 py-2 bg-gold hover:bg-gold-deep text-white text-sm font-semibold rounded-lg">
                    Yes, send it
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2 text-sm text-stone-300 border border-stone-600 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live preview: exactly what subscribers get (with the first subscriber's name) */}
          <NewsletterPreview draft={draft} firstName={subscribers[0]?.firstName || 'Ada'} />
        </div>
      )}

      {tab === 'welcome' && <WelcomeEmailEditor initial={welcome} adminEmail={adminEmail} emailReady={emailReady} previewName={subscribers[0]?.firstName || 'Ada'} />}

      {tab === 'subscribers' && <Subscribers subscribers={subscribers} onRemove={removeSubscriber} />}

      {tab === 'sent' &&
        (history.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-stone-800 text-left text-xs uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium text-right">Sent to</th>
                  <th className="px-4 py-3 font-medium text-right">Delivered</th>
                  <th className="px-4 py-3 font-medium text-right">Opened</th>
                  <th className="px-4 py-3 font-medium text-right">Problems</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {history.map((c) => (
                  <tr key={c.id} className="text-stone-200">
                    <td className="px-4 py-3 whitespace-nowrap text-stone-400">{fmtDate(c.startedAt)}</td>
                    <td className="px-4 py-3">{c.subject}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.sent}
                      {c.failed > 0 && <span className="text-red-300"> (+{c.failed} failed)</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.delivered}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.opened}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${c.problems ? 'text-red-300' : ''}`}>{c.problems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-stone-500 border-t border-stone-800">Delivered and opened need the Resend webhook (Admin → Emails). Opens are approximate: some email apps hide them.</p>
          </div>
        ))}

    </div>
  )
}

function Subscribers({ subscribers, onRemove }: { subscribers: SubscriberRow[]; onRemove: (id: string) => Promise<void> }) {
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const shown = subscribers.filter((s) => !q.trim() || `${s.firstName} ${s.email}`.toLowerCase().includes(q.trim().toLowerCase()))

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = ['First name,Email,Signed up on,Joined', ...subscribers.map((s) => [s.firstName, s.email, s.sourcePage ?? '', s.subscribedAt.slice(0, 10)].map(esc).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `twinkle-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (subscribers.length === 0) return <p className="text-sm text-stone-400">No subscribers yet. People join from the footer and the blog.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search subscribers" className={`${inputClass} sm:w-72`} />
        <button type="button" onClick={exportCsv} className="px-4 py-2 text-sm text-stone-200 border border-stone-600 rounded-lg hover:border-stone-400">
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-stone-800 text-left text-xs uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Signed up on</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 text-stone-200">
            {shown.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">{s.firstName}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3 text-stone-400">{s.sourcePage ?? 'Not recorded'}</td>
                <td className="px-4 py-3 text-stone-400 whitespace-nowrap">{fmtDate(s.subscribedAt)}</td>
                <td className="px-4 py-3 text-right">
                  {confirmId === s.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button type="button" autoFocus onClick={() => { setConfirmId(null); void onRemove(s.id) }} className="px-3 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded-lg">
                        Yes, remove
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="px-2 py-1 text-xs text-stone-300">Cancel</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(s.id)} aria-label={`Remove ${s.email}`} className="px-3 py-1 text-xs text-red-400 border border-red-900/40 hover:border-red-700 rounded-lg">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="text-sm text-stone-400">No one matches “{q}”.</p>}
    </div>
  )
}
