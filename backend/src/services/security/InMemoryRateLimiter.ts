/**
 * InMemoryRateLimiter
 *
 * Fixed-window RateLimiter backed by a plain Map. Correct and sufficient
 * for a single long-running server process (e.g. one container behind a
 * load balancer with sticky sessions, or a single VM).
 *
 * KNOWN LIMITATION: state lives in process memory, so it does NOT share
 * limits across multiple server instances or serverless invocations —
 * each instance/invocation gets its own counters. For a multi-instance
 * or serverless deployment, replace this with a Redis-backed
 * RateLimiter (e.g. using `INCR` + `EXPIRE`); nothing outside this file
 * needs to change, since routes depend on the RateLimiter interface.
 */
import type { RateLimiter, RateLimitResult } from "./RateLimiter";

interface Bucket {
  count: number;
  windowStart: number;
}

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastCleanup = Date.now();

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    this.cleanupIfDue(windowMs);

    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }

    if (existing.count < limit) {
      existing.count += 1;
      return { allowed: true };
    }

    const retryAfterMs = windowMs - (now - existing.windowStart);
    return { allowed: false, retryAfterMs };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Lazily sweeps stale buckets so memory doesn't grow unbounded. */
  private cleanupIfDue(windowMs: number) {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= windowMs) {
        this.buckets.delete(key);
      }
    }
    this.lastCleanup = now;
  }
}
