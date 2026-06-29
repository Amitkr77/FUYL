import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fuyl.in' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
    ],
  },
  // allow FUYL CDN images
};

export default nextConfig;
