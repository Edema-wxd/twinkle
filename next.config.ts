import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth'],
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Legacy: existing images already uploaded to Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
      // Uploadthing CDN — all new uploads
      { protocol: "https", hostname: "*.ufs.sh", pathname: "/f/*" },
    ],
  },
};

export default nextConfig;
