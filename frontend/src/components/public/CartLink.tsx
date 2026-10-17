/**
 * CartLink: header shortcut to the order summary; only visible once something is in the cart.
 */
"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <Link
      href="/book"
      className="rounded-sm bg-brass px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-brass-light"
      aria-label={`Your order, ${count} ${count === 1 ? "item" : "items"}`}
    >
      Order · {count}
    </Link>
  );
}
