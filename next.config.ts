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
  async redirects() {
    return [
      // The homepage is the shop. Old /catalog links (emails, WhatsApp, Google) land there; filters in the query are kept.
      { source: "/catalog", destination: "/", permanent: true },
    ];
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
              // connect.facebook.net / analytics.tiktok.com: Meta + TikTok pixels (loaded only after cookie consent)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://news.google.com https://connect.facebook.net https://analytics.tiktok.com",
              "style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com",
              // www.facebook.com / analytics.tiktok.com: pixel beacons (image fallback)
              "img-src 'self' data: blob: https://ta1u3ge9om.ufs.sh https://www.gstatic.com https://news.google.com https://www.facebook.com https://analytics.tiktok.com",
              // UploadThing: the browser PUTs files straight to {region}.ingest.uploadthing.com
              // Pixel event requests: Meta to www.facebook.com, TikTok to analytics.tiktok.com (+ its IPv6 endpoint)
              "connect-src 'self' https://api.paystack.co https://js.paystack.co https://*.uploadthing.com https://*.ufs.sh https://news.google.com https://www.facebook.com https://analytics.tiktok.com https://analytics-ipv6.tiktokw.us",
              // Paystack's payment popup is an iframe (checkout.paystack.com / standard.paystack.co).
              // Without frame-src it fell back to default-src 'self' and was blocked.
              "frame-src 'self' https://checkout.paystack.com https://standard.paystack.co https://news.google.com https://www.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Landing page hero videos uploaded to UploadThing (default-src 'self' would block them)
              "media-src 'self' blob: https://*.ufs.sh https://utfs.io",
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
