import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Versi aplikasi (dari package.json) + commit git bila tersedia, disematkan saat build.
// Hanya angka versi yang dikirim ke browser, bukan seluruh package.json.
const APP_VERSION = (JSON.parse(readFileSync("./package.json", "utf8")) as { version: string }).version;
const APP_COMMIT = (() => {
  if (process.env.APP_COMMIT) return process.env.APP_COMMIT;
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return ""; // mis. build Docker tanpa folder .git
  }
})();

const isDev = process.env.NODE_ENV !== "production";

// CSP statis (tanpa nonce, agar halaman statis tetap statis). Script eksternal diblokir;
// 'unsafe-inline' dibutuhkan untuk skrip inline Next.js & JSON-LD, 'unsafe-eval' hanya di dev.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS hanya di produksi (HTTPS via Traefik).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Menghasilkan .next/standalone untuk image Docker yang ringan (lihat Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_APP_COMMIT: APP_COMMIT,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
