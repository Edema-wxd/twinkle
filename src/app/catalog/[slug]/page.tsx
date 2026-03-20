// TODO (Phase 4): implement full product detail page

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="font-body text-charcoal/60 mb-2">
          Product detail coming in Phase 4
        </p>
        <p className="font-display text-2xl text-cocoa">{slug}</p>
        <a
          href="/catalog"
          className="mt-6 inline-block font-body text-sm text-gold underline"
        >
          ← Back to catalog
        </a>
      </div>
    </main>
  )
}
