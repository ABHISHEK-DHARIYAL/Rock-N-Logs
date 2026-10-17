/**
 * RateLimiter (interface)
 *
 * Contract for throttling repeated actions (login attempts, booking
 * submissions) by a caller-supplied key (typically `${action}:${ip}`).
 * Kept as an interface so InMemoryRateLimiter — sufficient for a single
 * server instance — can later be swapped for a Redis-backed
 * implementation for multi-instance/serverless deployments, with zero
 * changes to the API routes that depend on it (Dependency Inversion).
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the caller may retry, if not allowed. */
  retryAfterMs?: number;
}

export interface RateLimiter {
  /**
   * Records one attempt under `key` and reports whether it's within
   * `limit` attempts per `windowMs`.
   */
  consume(key: string, limit: number, windowMs: number): RateLimitResult;

  /** Clears throttling for `key` — used to reset on a successful login. */
  reset(key: string): void;
}
