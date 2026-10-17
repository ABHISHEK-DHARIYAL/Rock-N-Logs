/**
 * Public Error Boundary (error.tsx)
 *
 * Next.js renders this in place of a route segment that throws during
 * rendering (public pages only — /admin has its own, see
 * admin/(dashboard)/error.tsx). Must be a Client Component per Next.js's
 * error boundary contract. Logs to the console so a real deployment can
 * wire this into monitoring (Sentry, etc.) by replacing that one line.
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Swap for a real error-reporting call (Sentry.captureException, etc.)
    // in production — see README's reliability notes.
    console.error("Public site error:", error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-brass">Something went wrong</p>
        <h1 className="mt-3 font-display text-3xl text-ink">We hit a snag loading that page.</h1>
        <p className="mt-3 max-w-md text-ink/70">
          Nothing on your end — try again, or head back home. If it keeps happening, give us a
          call and we&apos;ll sort it out.
        </p>
        <div className="mt-8 flex gap-4">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/"
            className="rounded-sm border border-ink px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment"
          >
            Back home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
