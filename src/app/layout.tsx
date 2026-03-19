import type { Metadata } from "next";
import { halimun, raleway, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories for locs",
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
        {children}
      </body>
    </html>
  );
}
