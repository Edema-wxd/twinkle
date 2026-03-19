export default function HomePage() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 py-16 bg-cream">
      <h1 className="font-display text-5xl md:text-6xl text-cocoa text-center leading-tight">
        Twinkle Locs
      </h1>
      <p className="font-heading text-xl text-charcoal/70 text-center max-w-lg">
        Premium loc bead accessories — crafted for your loc journey
      </p>
      <a
        href="/catalog"
        className="bg-gold text-cocoa font-heading font-semibold px-8 py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors"
      >
        Shop the Collection
      </a>
    </section>
  );
}
