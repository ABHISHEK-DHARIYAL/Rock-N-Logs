/**
 * SiteHeader
 *
 * UI responsibility: top navigation for the public-facing site. Kept
 * separate from admin navigation (AdminSidebar) per the public/admin
 * separation rule — this component never renders admin links.
 */
import Link from "next/link";

const NAV_LINKS = [
  { href: "/restaurant", label: "Our Story" },
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/book", label: "Reserve" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-parchment">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          Rock n Logs
        </Link>
        <nav className="hidden gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-brass"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/book"
          className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment md:hidden"
        >
          Reserve
        </Link>
      </div>
    </header>
  );
}
