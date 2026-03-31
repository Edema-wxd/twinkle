import type { Metadata } from "next";
import { halimun, raleway, inter } from "@/lib/fonts";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'
  ),
  title: {
    default: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
    template: '%s | Twinkle Locs',
  },
  description: 'Premium loc bead accessories for your loc journey. Shop handcrafted Nigerian loc beads, gold, silver, crystal styles.',
  openGraph: {
    siteName: 'Twinkle Locs',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Twinkle Locs – Nigerian Loc Beads & Accessories' }],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${halimun.variable} ${raleway.variable} ${inter.variable}`}
    >
      <body className="font-body bg-cream text-charcoal antialiased">
        <Providers>
          <StorefrontChrome>{children}</StorefrontChrome>
        </Providers>
      </body>
    </html>
  );
}
