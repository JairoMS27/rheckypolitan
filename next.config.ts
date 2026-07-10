import type { NextConfig } from "next";

const supabaseHost = "pcfnivdovairzfkkmkbx.supabase.co";
const r2Host = "pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev";

/**
 * Practical CSP for Next.js + Supabase + TipTap embeds.
 * 'unsafe-inline' / 'unsafe-eval' are required by Next runtime without nonces.
 * Tighten later with nonce-based CSP if you invest in that pipeline.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost} https://${r2Host}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "media-src 'self' blob: data:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
      },
      {
        protocol: "https",
        hostname: r2Host,
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
