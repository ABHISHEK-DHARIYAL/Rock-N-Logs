/**
 * SiteFooter
 *
 * UI responsibility: closing section shared across public pages with
 * contact basics and a return link to reservations.
 */
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-ink text-parchment">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-xl">Rock n Logs</p>
          <p className="mt-1 text-sm text-parchment/70">
            Open Tuesday–Sunday, 5pm until late.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:gap-6">
          <Link href="/contact" className="text-parchment/80 hover:text-brass-light">
            Contact
          </Link>
          <Link href="/book" className="text-parchment/80 hover:text-brass-light">
            Reserve a table
          </Link>
          <Link href="/privacy" className="text-parchment/50 hover:text-parchment/80">
            Privacy
          </Link>
          <Link href="/terms" className="text-parchment/50 hover:text-parchment/80">
            Terms
          </Link>
          <Link href="/admin/login" className="text-parchment/40 hover:text-parchment/70">
            Staff
          </Link>
        </div>
      </div>
    </footer>
  );
}
