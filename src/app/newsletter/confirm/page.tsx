import type { Metadata } from 'next'
import { ConfirmForm } from './ConfirmForm'

export const metadata: Metadata = { title: 'Confirm your sign-up', robots: { index: false, follow: false } }

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e, t } = await searchParams
  return (
    <div className="bg-cream">
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
        <h1 className="font-display text-4xl leading-[1.2] text-forest sm:text-5xl">Newsletter</h1>
        <ConfirmForm email={typeof e === 'string' ? e : ''} token={typeof t === 'string' ? t : ''} />
      </div>
    </div>
  )
}
