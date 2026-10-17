/**
 * Admin Error Boundary (error.tsx)
 *
 * Scoped to the (dashboard) route group, so it nests INSIDE
 * (dashboard)/layout.tsx — the sidebar stays visible and usable even
 * when a specific admin page throws, letting staff navigate away
 * without losing their session context.
 */
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Swap for a real error-reporting call (Sentry.captureException, etc.)
    // in production.
    console.error("Admin panel error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start">
      <p className="text-sm uppercase tracking-[0.2em] text-rust">Something went wrong</p>
      <h1 className="mt-2 font-display text-2xl text-ink">This page hit an error.</h1>
      <p className="mt-2 max-w-md text-ink/70">
        Your other admin pages are unaffected — use the sidebar to navigate, or try this page
        again.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink/40">Reference: {error.digest}</p>}
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
