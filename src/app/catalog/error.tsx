'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorState } from '@/components/ErrorState'

/** The shop and product pages: if products can't load, offer a retry and WhatsApp ordering so the sale isn't lost. */
export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    console.error('[catalog error]', error)
  }, [error])

  return (
    <ErrorState
      title="The shop is taking a moment"
      message="We couldn’t load our beads just now. Please try again, or message us on WhatsApp and we’ll take your order there."
      whatsappMessage="Hi, the shop page wouldn't load. I'd like to order some beads."
      digest={error.digest}
      onRetry={() => startTransition(() => { router.refresh(); reset() })}
    />
  )
}
