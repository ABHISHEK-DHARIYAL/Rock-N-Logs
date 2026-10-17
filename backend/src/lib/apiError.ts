/**
 * API Error Handling
 *
 * Maps the domain error hierarchy (domain/errors.ts) to HTTP status codes
 * and safe JSON bodies, so raw error messages, database errors and
 * provider internals never reach the client.
 */
import type { Response } from "express";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ExternalServiceError,
  DomainError,
} from "../domain/errors";

/** Prisma error code like "P2022" (from query errors and from connection/initialisation errors). */
export function prismaCode(error: unknown): string | undefined {
  const e = error as { code?: unknown; errorCode?: unknown } | null;
  const value = typeof e?.code === "string" ? e.code : typeof e?.errorCode === "string" ? e.errorCode : undefined;
  return value && /^P\d{4}$/.test(value) ? value : undefined;
}

/** The database is missing a table/column the code expects (a deploy that didn't run `prisma db push`). */
export const SCHEMA_OUTDATED_CODES = ["P2021", "P2022"];
/** The database couldn't be reached, timed out, or dropped the connection (e.g. a sleeping free-tier DB). */
export const DB_UNAVAILABLE_CODES = ["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"];

export function sendError(res: Response, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof AuthenticationError) {
    res.status(401).json({ error: error.message });
  } else if (error instanceof AuthorizationError) {
    res.status(403).json({ error: error.message });
  } else if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
  } else if (error instanceof ExternalServiceError) {
    console.error(error);
    res.status(502).json({ error: "A dependent service is temporarily unavailable. Please try again." });
  } else if (error instanceof DomainError) {
    res.status(400).json({ error: error.message });
  } else {
    console.error("Unexpected error:", error);
    const code = prismaCode(error);
    if (code && SCHEMA_OUTDATED_CODES.includes(code)) {
      // Not the customer's fault and retrying won't help: say so, with a code the owner can search for.
      res.status(503).json({ error: "Our booking system is being updated. Please try again in a few minutes, or call us to book.", code: "DB_SCHEMA_OUTDATED" });
    } else if (code && DB_UNAVAILABLE_CODES.includes(code)) {
      res.status(503).json({ error: "We're having trouble reaching our system. Please try again in a minute, or call us to book.", code: "DB_UNAVAILABLE" });
    } else {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }
}
