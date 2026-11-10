import Link from 'next/link';
import { BUSINESS } from '@/lib/config/business';

export function HeroSection() {
  return (
    <section className="bg-linear-to-br from-forest via-forest/90 to-gold/20 min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <p className="font-heading text-xs font-semibold text-gold-light uppercase tracking-[0.24em] mb-8">
        Premium Loc Accessories
      </p>

      <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-gold-light leading-[1.2] mb-6">
        Adorn Your Locs
      </h1>

      <p className="font-heading text-lg md:text-xl text-cream/85 max-w-lg mb-10">
        Handcrafted bead accessories designed for the modern loc wearer. From the heart of Nigeria, for the world.
      </p>

      <Link
        href="/catalog"
        className="inline-flex min-h-14 items-center bg-gold-light text-forest font-heading font-semibold px-10 py-4 rounded-lg hover:bg-cream transition-colors text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
      >
        Explore Beads
      </Link>

      <a
        href={BUSINESS.whatsapp.url("Hi, I'd like to place an order")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center font-body text-sm text-cream/80 hover:text-cream transition-colors underline underline-offset-4"
      >
        or order directly on WhatsApp
      </a>
    </section>
  );
}
