import Link from 'next/link';
import { BUSINESS } from '@/lib/config/business';

export function HeroSection() {
  return (
    <section className="bg-linear-to-br from-cocoa via-cocoa/80 to-gold/20 min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <p className="font-body text-sm text-gold/80 uppercase tracking-widest mb-4">
        Premium Loc Accessories
      </p>

      <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-gold leading-tight mb-6">
        Adorn Your Locs
      </h1>

      <p className="font-heading text-lg md:text-xl text-cream/80 max-w-lg mb-10">
        Handcrafted bead accessories designed for the modern loc wearer. From the heart of Nigeria, for the world.
      </p>

      <Link
        href="/catalog"
        className="bg-gold text-cocoa font-heading font-semibold px-10 py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-lg inline-block"
      >
        Explore Beads
      </Link>

      <a
        href={BUSINESS.whatsapp.url("Hi, I'd like to place an order")}
        className="mt-4 font-body text-sm text-cream/50 hover:text-cream/80 transition-colors underline underline-offset-4"
      >
        or order directly on WhatsApp
      </a>
    </section>
  );
}
