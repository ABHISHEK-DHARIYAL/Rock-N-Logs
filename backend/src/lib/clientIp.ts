/**
 * Client IP helper.
 *
 * Requests reach this API through Vercel's rewrite proxy and then Render's
 * load balancer, so the caller's real IP is the FIRST entry of
 * `x-forwarded-for` (not `req.ip`, which would be the proxy's address and
 * would make every visitor share one rate-limit bucket).
 */
import type { Request } from "express";

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (first) return first.split(",")[0].trim();
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp) return realIp;
  return req.socket.remoteAddress ?? "unknown";
}
