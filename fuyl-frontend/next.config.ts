import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.138"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fuyl.in",
      },
      {
        // Used by why-fuyl/PillarTabs. Kept because it's referenced in live UI;
        // cdn.shopify.com / example.com were removed as unused scaffolding.
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // CLOUDINARY
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
