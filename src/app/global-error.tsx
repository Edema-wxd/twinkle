'use client'

import { useEffect } from 'react'
import { halimun, mistrully, montserrat } from '@/lib/fonts'
import { ErrorState } from '@/components/ErrorState'
import './globals.css'

/** Last resort: the root layout itself failed, so this replaces the whole page (it must render <html> and <body>). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html lang="en" className={`${halimun.variable} ${mistrully.variable} ${montserrat.variable}`}>
      <body className="font-body bg-forest text-charcoal antialiased min-h-screen">
        <ErrorState
          title="We couldn’t load the site"
          message="Something on our side didn’t respond. Please try again in a moment, or message us on WhatsApp."
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  )
}
