/**
 * Custom 404 Page (not-found.tsx)
 *
 * Rendered for any route that doesn't match a page — replaces Next.js's
 * default 404 with something on-brand and with useful navigation back
 * into the site.
 */
import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-6xl text-brass">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink">This table&apos;s not set.</h1>
      <p className="mt-3 max-w-md text-ink/70">
        We couldn&apos;t find the page you were looking for. It may have moved, or the link
        might be off.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-parchment transition-colors hover:bg-moss"
        >
          Back home
        </Link>
        <Link
          href="/menu"
          className="rounded-sm border border-ink px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment"
        >
          View the menu
        </Link>
      </div>
    </main>
  );
}
