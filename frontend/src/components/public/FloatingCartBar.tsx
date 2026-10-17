/**
 * FloatingCartBar: sticky summary at the bottom of the menu page once dishes are added.
 */
"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export function FloatingCartBar() {
  const { count, total } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink text-parchment shadow-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
        <p className="text-sm">
          <span className="font-medium">{count} {count === 1 ? "item" : "items"}</span>
          <span className="mx-2 text-parchment/50">·</span>
          <span>{formatMoney(total)}</span>
        </p>
        <Link href="/book" className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brass-light">
          Review order &amp; book a table
        </Link>
      </div>
    </div>
  );
}
