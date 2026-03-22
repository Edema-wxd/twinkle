import Link from 'next/link'

export default function ProductNotFound() {
  return (
    <main className="bg-cream min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="font-display text-4xl text-cocoa mb-4">
          Product not found
        </h1>
        <p className="font-body text-charcoal/60 mb-6">
          This product doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/catalog"
          className="font-body text-sm text-gold hover:underline"
        >
          ← Back to catalog
        </Link>
      </div>
    </main>
  )
}
