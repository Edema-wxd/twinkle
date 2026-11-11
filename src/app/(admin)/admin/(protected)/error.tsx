'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/** Admin pages: keep the sidebar, explain what happened, offer a retry. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    console.error('[admin error]', error)
  }, [error])

  return (
    <div className="p-6 lg:p-10">
      <div role="alert" className="max-w-lg rounded-xl bg-stone-900 ring-1 ring-stone-700 p-6">
        <h1 className="font-heading text-lg font-semibold text-white">This page didn’t load</h1>
        <p className="mt-2 text-sm text-stone-300">
          The database or a connected service didn’t respond. Nothing you saved before this is lost. Try again in a moment.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => { router.refresh(); reset() })}
            className="px-5 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {pending ? 'Trying…' : 'Try again'}
          </button>
          <a href="/admin" className="text-sm text-stone-300 hover:text-white">
            Back to dashboard
          </a>
        </div>
        {error.digest && <p className="mt-5 text-xs text-stone-500">Reference: {error.digest}</p>}
      </div>
    </div>
  )
}
