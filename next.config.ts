import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth'],
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Uploadthing CDN
      { protocol: "https", hostname: "ta1u3ge9om.ufs.sh", pathname: "/f/*" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // news.google.com: Google "Preferred Sources" button on blog posts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://news.google.com",
              "style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://ta1u3ge9om.ufs.sh https://www.gstatic.com https://news.google.com",
              // UploadThing: the browser PUTs files straight to {region}.ingest.uploadthing.com
              "connect-src 'self' https://api.paystack.co https://js.paystack.co https://*.uploadthing.com https://*.ufs.sh https://news.google.com",
              // Paystack's payment popup is an iframe (checkout.paystack.com / standard.paystack.co).
              // Without frame-src it fell back to default-src 'self' and was blocked.
              "frame-src 'self' https://checkout.paystack.com https://standard.paystack.co https://news.google.com https://www.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
