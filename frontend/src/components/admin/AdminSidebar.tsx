/**
 * AdminSidebar
 *
 * UI responsibility: navigation for the /admin section. Deliberately a
 * separate component from SiteHeader (public/admin separation) — it
 * never shares markup or links with the public nav.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/menu-pdf", label: "PDF Menu" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-line bg-parchment px-5 py-8">
      <p className="font-display text-xl text-ink">Rock n Logs</p>
      <p className="text-xs uppercase tracking-wide text-ink/50">Staff panel</p>

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-ink text-parchment" : "text-ink/70 hover:bg-parchment-dim"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Button variant="ghost" onClick={handleLogout} className="justify-start px-3">
        Sign out
      </Button>
    </aside>
  );
}
