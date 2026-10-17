/**
 * Allowed-origin matching, shared by CORS and the CSRF origin check.
 *
 * FRONTEND_URL is a comma-separated list. Each entry is an origin without a
 * trailing slash. A `*` inside the hostname matches a single DNS label chunk,
 * which makes Vercel preview URLs easy to allow without opening everything:
 *
 *   https://rock-n-logs.vercel.app, https://rock-n-logs-*.vercel.app
 */
import { env } from "./env";

function toMatcher(entry: string): (origin: string) => boolean {
  if (!entry.includes("*")) return (origin) => origin === entry;
  const pattern = entry
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[a-z0-9-]+");
  const regex = new RegExp(`^${pattern}$`, "i");
  return (origin) => regex.test(origin);
}

export function isAllowedOrigin(rawOrigin: string): boolean {
  let origin: string;
  try {
    origin = new URL(rawOrigin).origin;
  } catch {
    return false;
  }
  return env.frontendOrigins().some((entry) => toMatcher(entry)(origin));
}
