import type { NextConfig } from "next";

/**
 * Next.js Configuration
 *
 * `headers()` applies security headers to every response, defense-in-
 * depth against common web attacks (clickjacking, MIME-sniffing,
 * protocol-downgrade, unwanted embedding/permissions). These are
 * response-level and apply regardless of which route handled the
 * request, unlike the auth checks in middleware.ts.
 *
 * CSP note: `script-src` includes 'unsafe-inline' because Next.js
 * injects inline hydration data without a nonce by default in this
 * setup. For stricter script security, adopt Next's nonce-based CSP
 * (see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
 * — that requires generating a per-request nonce in middleware and
 * threading it through the root layout, which is a reasonable next step
 * but more invasive than a first security pass.
 *
 * DEV-ONLY RELAXATIONS: `next dev` needs two things production doesn't —
 * `unsafe-eval` (React's dev-mode debugging/Fast Refresh uses eval()) and
 * a `connect-src` that allows the HMR websocket (ws://localhost:*, which
 * CSP treats as a different origin from http://localhost:* even though
 * it's the same host/port). Both are added ONLY when NODE_ENV is
 * development, so the production CSP stays strict.
 */
const isDev = process.env.NODE_ENV === "development";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // data: is required because MockImageStorage/MockDocumentStorage
  // encode uploads as data URLs; res.cloudinary.com is allow-listed for
  // when Cloudinary is configured as the real provider.
  "img-src 'self' data: https://res.cloudinary.com",
  `connect-src 'self'${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS is only meaningful over HTTPS; harmless to send otherwise, but
  // only enable it once the site is actually served over HTTPS in
  // production, since it forces the browser to refuse HTTP entirely for
  // this domain going forward.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Fail the Vercel build loudly instead of shipping a site whose /api/* rewrites
// silently point at localhost (which makes every page and the admin panel error).
if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error("BACKEND_URL is not set. Add it in Vercel -> Settings -> Environment Variables (your Render URL).");
}

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Browser calls to /api/* are proxied to the Express backend (Render), so the
  // admin session cookie stays first-party to this site and CORS never applies.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
