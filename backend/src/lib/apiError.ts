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
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
