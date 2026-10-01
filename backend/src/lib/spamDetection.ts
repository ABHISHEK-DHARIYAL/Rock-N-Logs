/**
 * Spam Detection Heuristics
 *
 * Two lightweight, dependency-free signals used to filter automated
 * submissions on public forms (currently just /api/bookings) without a
 * CAPTCHA, which would add friction for real customers:
 *
 *   1. Honeypot — a field real users never see or fill in (hidden via
 *      CSS, not `type="hidden"`, since some bots skip truly hidden
 *      inputs). Any value here means it was filled by a script.
 *   2. Minimum fill time — the form records when it rendered; a
 *      submission arriving faster than a human could plausibly type is
 *      almost certainly scripted.
 *
 * These are deliberately non-blocking-looking to the caller: routes
 * using this should accept the request superficially (same response
 * shape) without persisting anything, rather than returning an error
 * that would let a bot detect and adapt to the check.
 */
const MIN_HUMAN_FILL_TIME_MS = 1500;

export interface SpamCheckInput {
  /** Value of the honeypot field; should always be empty for real users. */
  honeypot?: string;
  /** Client-recorded timestamp (ms since epoch) when the form was rendered. */
  formRenderedAt?: number;
}

export function isLikelySpam(input: SpamCheckInput): boolean {
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return true;
  }

  if (typeof input.formRenderedAt === "number") {
    const elapsed = Date.now() - input.formRenderedAt;
    if (elapsed >= 0 && elapsed < MIN_HUMAN_FILL_TIME_MS) {
      return true;
    }
  }

  return false;
}
