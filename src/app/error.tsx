'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorState } from '@/components/ErrorState'

/** Any page that fails to load (database or network hiccup) lands here instead of a bare error screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    console.error('[page error]', error)
  }, [error])

  return (
    <ErrorState
      title="We couldn’t load this page"
      message="Something on our side didn’t respond. It’s usually brief, so please try again in a moment."
      digest={error.digest}
      // refresh() re-fetches the server data; reset() re-renders the page with it
      onRetry={() => startTransition(() => { router.refresh(); reset() })}
    />
  )
}
