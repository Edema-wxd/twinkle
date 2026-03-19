export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream p-8">
      <h1 className="font-display text-5xl text-cocoa">Twinkle Locs</h1>
      <p className="font-heading text-xl text-charcoal">Premium loc bead accessories</p>
      <button className="bg-gold text-cocoa px-6 py-3 rounded-lg font-heading font-semibold hover:bg-terracotta hover:text-cream transition-colors">
        Shop Now
      </button>
      <p className="font-body text-sm text-charcoal/60">
        Design tokens active — gold, cocoa, cream, forest, terracotta
      </p>
    </main>
  );
}
