'use client'

import { useState, useEffect, useTransition } from 'react'

type MergedEmail = {
  resendId: string | null
  logId: string | null
  to: string[]
  from: string | null
  subject: string
  lastEvent: string
  templateKey: string | null
  orderId: string | null
  canResend: boolean
  createdAt: string
}

type EmailTemplate = {
  key: string
  name: string
  subject: string
  bannerColor: string
  bannerLabel: string
  body: string
  updatedAt: string
}

type Tab = 'log' | 'compose' | 'templates'

const TEMPLATE_NAMES: Record<string, string> = {
  confirmed: 'Order Confirmed',
  processing: 'Order Processing',
  shipped: 'Order Shipped',
  delivered: 'Order Delivered',
  review_reminder: 'Review Reminder',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Status badge helpers ──────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  delivered: 'bg-green-900/60 text-green-400',
  opened:    'bg-green-900/40 text-green-300',
  clicked:   'bg-green-900/40 text-green-300',
  sent:      'bg-blue-900/50 text-blue-300',
  queued:    'bg-stone-700 text-stone-300',
  scheduled: 'bg-stone-700 text-stone-300',
  bounced:   'bg-red-900/60 text-red-400',
  failed:    'bg-red-900/60 text-red-400',
  complained:'bg-orange-900/60 text-orange-400',
  canceled:  'bg-stone-700 text-stone-500',
  delivery_delayed: 'bg-yellow-900/50 text-yellow-400',
}

function EventBadge({ event }: { event: string }) {
  const cls = EVENT_COLORS[event] ?? 'bg-stone-700 text-stone-400'
  const label = event.replace('_', ' ')
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  )
}

const RESEND_FAIL_EVENTS = new Set(['bounced', 'failed', 'complained', 'delivery_delayed'])

// ── Log Tab ───────────────────────────────────────────────────────────────────

function LogTab({ emails: initial, hasMore: initialHasMore }: { emails: MergedEmail[]; hasMore: boolean }) {
  const [emails, setEmails] = useState<MergedEmail[]>(initial)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [filter, setFilter] = useState<'all' | 'delivered' | 'failed'>('all')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  async function refreshEmails() {
    try {
      const res = await fetch('/api/admin/emails')
      const data = await res.json() as { emails: MergedEmail[]; hasMore: boolean }
      setEmails(data.emails ?? [])
      setHasMore(data.hasMore ?? false)
    } catch {
      showToast('error', 'Failed to refresh email list')
    }
  }

  function handleResend(logId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/emails/${logId}/resend`, { method: 'POST' })
        const data = await res.json() as { sent?: boolean; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Resend failed')
        showToast('success', 'Email resent successfully')
        await refreshEmails()
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Resend failed')
      }
    })
  }

  const failedCount = emails.filter((e) => RESEND_FAIL_EVENTS.has(e.lastEvent)).length

  const filtered =
    filter === 'all' ? emails :
    filter === 'delivered' ? emails.filter((e) => e.lastEvent === 'delivered') :
    emails.filter((e) => RESEND_FAIL_EVENTS.has(e.lastEvent))

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-body shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {(['all', 'delivered', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-colors ${
              filter === f
                ? 'bg-gold text-white'
                : 'bg-stone-800 text-stone-400 hover:text-white'
            }`}
          >
            {f === 'all'
              ? `All (${emails.length}${hasMore ? '+' : ''})`
              : f === 'delivered'
              ? `Delivered (${emails.filter((e) => e.lastEvent === 'delivered').length})`
              : `Failed (${failedCount})`}
          </button>
        ))}
        <button
          onClick={() => startTransition(refreshEmails)}
          disabled={isPending}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-heading text-stone-400 hover:text-white bg-stone-800 transition-colors disabled:opacity-40"
        >
          {isPending ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-400 font-body text-sm py-8 text-center">No emails found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-700">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-stone-700 text-left">
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">To</th>
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Subject</th>
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((email, i) => {
                const rowKey = email.resendId ?? email.logId ?? String(i)
                const isResendable = email.canResend && RESEND_FAIL_EVENTS.has(email.lastEvent) && email.logId
                return (
                  <tr key={rowKey} className="border-b border-stone-800 hover:bg-stone-900/50">
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap text-xs">
                      {formatDate(email.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-stone-300 max-w-[180px]">
                      <div className="truncate" title={email.to.join(', ')}>
                        {email.to.length === 1 ? email.to[0] : `${email.to[0]} +${email.to.length - 1}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white max-w-[220px]">
                      <div className="truncate" title={email.subject}>{email.subject}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                      {email.templateKey
                        ? (TEMPLATE_NAMES[email.templateKey] ?? email.templateKey)
                        : <span className="text-stone-500 italic">Custom</span>}
                    </td>
                    <td className="px-4 py-3">
                      <EventBadge event={email.lastEvent} />
                    </td>
                    <td className="px-4 py-3">
                      {isResendable && (
                        <button
                          onClick={() => handleResend(email.logId!)}
                          disabled={isPending}
                          className="text-xs text-gold hover:text-gold/80 underline transition-colors disabled:opacity-40"
                        >
                          Resend
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <p className="text-center text-xs text-stone-500 font-body">
          Showing latest 100 emails from Resend. Older emails are not listed.
        </p>
      )}
    </div>
  )
}

// ── Compose Tab ───────────────────────────────────────────────────────────────

function ComposeTab() {
  const [form, setForm] = useState({ to: '', subject: '', body: '' })
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [preview, setPreview] = useState(false)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.to.trim() || !form.subject.trim() || !form.body.trim()) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: form.to,
            subject: form.subject,
            htmlBody: form.body.includes('<') ? form.body : null,
            textBody: !form.body.includes('<') ? form.body : form.body.replace(/<[^>]+>/g, ''),
          }),
        })
        const data = await res.json() as { sent?: boolean; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Send failed')
        setForm({ to: '', subject: '', body: '' })
        showToast('success', 'Email sent successfully')
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to send email')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-body shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSend} className="bg-stone-900 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-heading text-stone-400 mb-1">
            To <span className="text-stone-600 font-normal">(comma-separated for multiple)</span>
          </label>
          <input
            type="text"
            required
            value={form.to}
            onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
            placeholder="customer@example.com, another@example.com"
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-xs font-heading text-stone-400 mb-1">Subject</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="Important update from Twinkle Locs"
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-heading text-stone-400">
              Body <span className="text-stone-600 font-normal">(plain text or HTML)</span>
            </label>
            {form.body && (
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="text-xs text-stone-400 hover:text-white underline transition-colors"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            )}
          </div>
          {preview ? (
            <div
              className="min-h-[200px] bg-white rounded-lg p-4 text-stone-900 text-sm font-body overflow-auto"
              dangerouslySetInnerHTML={{ __html: form.body }}
            />
          ) : (
            <textarea
              required
              rows={10}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Write your message here. You can use plain text or HTML."
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold resize-y font-mono"
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending || !form.to.trim() || !form.subject.trim() || !form.body.trim()}
            className="px-6 py-2.5 bg-gold text-white font-heading font-semibold text-sm rounded-lg disabled:opacity-40 hover:bg-gold/90 transition-colors"
          >
            {isPending ? 'Sending…' : 'Send Email'}
          </button>
          <p className="text-xs text-stone-500 font-body">
            Emails are sent from your Resend-configured address.
          </p>
        </div>
      </form>
    </div>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  templateKey,
  bannerColor,
  bannerLabel,
  body,
  name,
  onClose,
}: {
  templateKey: string
  bannerColor: string
  bannerLabel: string
  body: string
  name: string
  onClose: () => void
}) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/email-templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey, bannerColor, bannerLabel, body }),
    })
      .then((r) => r.json())
      .then((d: { html?: string; error?: string }) => {
        if (d.html) setHtml(d.html)
        else setError(d.error ?? 'Failed to load preview')
      })
      .catch(() => setError('Network error loading preview'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="relative bg-stone-900 rounded-xl border border-stone-700 w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <div>
            <p className="font-heading font-semibold text-white text-sm">{name} — Preview</p>
            <p className="text-xs text-stone-500 mt-0.5">Sample data — not a real order</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white transition-colors rounded-lg hover:bg-stone-800"
            aria-label="Close preview"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-2">
          {!html && !error && (
            <div className="flex items-center justify-center py-16 text-stone-500 font-body text-sm">
              Loading preview…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-16 text-red-400 font-body text-sm">
              {error}
            </div>
          )}
          {html && (
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full rounded-lg border border-stone-800"
              style={{ height: '600px' }}
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab({ templates: initial }: { templates: EmailTemplate[] }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initial)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [previewing, setPreviewing] = useState<EmailTemplate | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  async function ensureTemplates() {
    if (templates.length > 0) return
    const res = await fetch('/api/admin/email-templates')
    const data = await res.json() as { templates: EmailTemplate[] }
    setTemplates(data.templates ?? [])
  }

  function handleEdit(t: EmailTemplate) {
    startTransition(async () => {
      await ensureTemplates()
      setEditing({ ...t })
    })
  }

  function handleSave() {
    if (!editing) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/email-templates/${editing.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: editing.subject,
            bannerColor: editing.bannerColor,
            bannerLabel: editing.bannerLabel,
            body: editing.body,
          }),
        })
        const data = await res.json() as { template?: EmailTemplate; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
        setTemplates((prev) => prev.map((t) => (t.key === editing.key ? data.template! : t)))
        setEditing(null)
        showToast('success', 'Template saved')
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to save template')
      }
    })
  }

  const displayTemplates = templates.length > 0 ? templates : []

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-body shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <PreviewModal
          templateKey={previewing.key}
          bannerColor={previewing.bannerColor}
          bannerLabel={previewing.bannerLabel}
          body={previewing.body}
          name={previewing.name}
          onClose={() => setPreviewing(null)}
        />
      )}

      <p className="text-stone-400 text-sm font-body">
        Edit the content of each customer email. Use <code className="text-gold bg-stone-800 px-1 rounded text-xs">{'{ref}'}</code> in the subject as a placeholder for the order reference.
      </p>

      {/* Edit panel */}
      {editing && (
        <div className="bg-stone-900 border border-stone-600 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-white">
              Editing: {editing.name}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewing({ ...editing })}
                className="text-xs text-stone-400 hover:text-white underline transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-stone-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-heading text-stone-400 mb-1">
                Subject <span className="text-stone-600">({'{ref}'} = order reference)</span>
              </label>
              <input
                type="text"
                value={editing.subject}
                onChange={(e) => setEditing((p) => p && ({ ...p, subject: e.target.value }))}
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-heading text-stone-400 mb-1">Banner Label</label>
              <input
                type="text"
                value={editing.bannerLabel}
                onChange={(e) => setEditing((p) => p && ({ ...p, bannerLabel: e.target.value }))}
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-heading text-stone-400 mb-1">Banner Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editing.bannerColor}
                  onChange={(e) => setEditing((p) => p && ({ ...p, bannerColor: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer bg-stone-800 border border-stone-600 p-0.5"
                />
                <input
                  type="text"
                  value={editing.bannerColor}
                  onChange={(e) => setEditing((p) => p && ({ ...p, bannerColor: e.target.value }))}
                  className="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-gold"
                  placeholder="#1c1917"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-heading text-stone-400 mb-1">Email Body</label>
              <textarea
                rows={6}
                value={editing.body}
                onChange={(e) => setEditing((p) => p && ({ ...p, body: e.target.value }))}
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-gold resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Banner preview strip */}
          <div>
            <p className="text-xs font-heading text-stone-500 mb-2 uppercase tracking-wide">Banner preview</p>
            <div
              className="rounded-lg px-6 py-3 text-white text-sm font-semibold"
              style={{ backgroundColor: editing.bannerColor }}
            >
              {editing.bannerLabel}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-6 py-2.5 bg-gold text-white font-heading font-semibold text-sm rounded-lg disabled:opacity-40 hover:bg-gold/90 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save Template'}
            </button>
            <button
              onClick={() => setPreviewing({ ...editing })}
              disabled={isPending}
              className="px-4 py-2.5 text-stone-300 font-heading text-sm bg-stone-800 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-40"
            >
              Preview Email
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={isPending}
              className="px-4 py-2.5 text-stone-400 font-heading text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayTemplates.map((t) => (
          <div
            key={t.key}
            className={`bg-stone-900 rounded-xl border transition-colors ${
              editing?.key === t.key ? 'border-gold' : 'border-stone-700'
            }`}
          >
            {/* Banner color strip */}
            <div className="rounded-t-xl h-2" style={{ backgroundColor: t.bannerColor }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-heading font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">{t.key}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setPreviewing(t)}
                    disabled={isPending}
                    className="text-xs text-stone-400 hover:text-white font-heading underline transition-colors disabled:opacity-40"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    disabled={isPending}
                    className="text-xs text-gold hover:text-gold/80 font-heading underline transition-colors disabled:opacity-40"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-400 font-body mb-2 line-clamp-1" title={t.subject}>
                <span className="text-stone-600">Subject: </span>{t.subject}
              </p>
              <p className="text-xs text-stone-400 font-body line-clamp-3 leading-relaxed">{t.body}</p>
              <p className="text-xs text-stone-700 mt-3">
                Updated {new Date(t.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}

        {displayTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-stone-400 font-body text-sm mb-4">No templates loaded yet.</p>
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/email-templates')
                const data = await res.json() as { templates: EmailTemplate[] }
                setTemplates(data.templates ?? [])
              }}
              className="px-4 py-2 bg-gold text-white text-sm font-heading rounded-lg hover:bg-gold/90 transition-colors"
            >
              Load Templates
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailsManager({
  initialEmails,
  initialHasMore,
  initialTemplates,
}: {
  initialEmails: MergedEmail[]
  initialHasMore: boolean
  initialTemplates: EmailTemplate[]
}) {
  const [tab, setTab] = useState<Tab>('log')

  const failedCount = initialEmails.filter((e) => RESEND_FAIL_EVENTS.has(e.lastEvent)).length

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'log', label: 'Email Log', badge: failedCount > 0 ? failedCount : undefined },
    { id: 'compose', label: 'Compose' },
    { id: 'templates', label: 'Templates' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-heading font-medium transition-colors rounded-t-lg ${
              tab === t.id
                ? 'text-white bg-stone-800 border border-b-0 border-stone-700'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-xs font-bold leading-none">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'log' && <LogTab emails={initialEmails} hasMore={initialHasMore} />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'templates' && <TemplatesTab templates={initialTemplates} />}
      </div>
    </div>
  )
}
