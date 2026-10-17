/**
 * Admin auth middleware — the server-enforced authorization boundary for
 * every /api/admin/* route (except login/logout). Verifies the JWT in the
 * httpOnly session cookie.
 */
import type { NextFunction, Request, Response } from "express";
import { authService } from "../container";
import { ADMIN_SESSION_COOKIE } from "../lib/constants";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  const session = token ? await authService.verifySessionToken(token) : null;
  if (!session) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}
