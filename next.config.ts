import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth'],
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
