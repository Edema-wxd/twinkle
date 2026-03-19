import type { Metadata } from "next";
import { halimun, raleway, inter } from "@/lib/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories for your loc journey",
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
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
