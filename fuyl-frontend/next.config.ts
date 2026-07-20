import type { NextConfig } from "next";

// Report-only for now: validates against real traffic without risking Next's
// inline runtime / JSON-LD blocks. Promote the header key to
// "Content-Security-Policy" once reports are clean. The storefront's real XSS
// defense is render-time HTML sanitization (see components/content/RichText);
// this is defense-in-depth + clickjacking protection.
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
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
      { protocol: "https", hostname: "example.com" },
    ],
  },
};

export default nextConfig;
