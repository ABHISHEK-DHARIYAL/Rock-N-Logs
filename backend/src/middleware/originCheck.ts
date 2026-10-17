/**
 * CSRF defense-in-depth for state-changing /api/admin requests: when the
 * browser sends an Origin header it must match one of FRONTEND_URL's
 * entries. (The session cookie is also SameSite=Lax.)
 */
import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../lib/origins";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (isAllowedOrigin(origin)) return next();

  console.warn(
    `[originCheck] Blocked ${req.method} ${req.originalUrl} from origin "${origin}". ` +
      `Add it to FRONTEND_URL on Render (currently: ${process.env.FRONTEND_URL ?? "unset"}).`
  );
  res.status(403).json({ error: "Request origin could not be verified." });
}
