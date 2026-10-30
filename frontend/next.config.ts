import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Separate build dir lets the E2E production build run next to the dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The browser talks to the API on the same origin; Next.js forwards to FastAPI.
  // This keeps the admin auth cookie first-party and HTTP-only.
  // The About page is now a section of the home page; faculty profiles open as a popup.
  async redirects() {
    return [
      { source: "/about", destination: "/#about", permanent: true },
      { source: "/faculty/:slug", destination: "/faculty?profile=:slug", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${API_URL}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
