/**
 * CartSync: once per visit, checks the saved cart against the live menu and drops dishes that
 * were deleted or made unavailable, telling the customer which ones. Without this, a stale cart
 * makes the booking request fail with a vague "no longer on the menu" error.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { MenuCategoryWithItems } from "@/lib/types";

export function CartSync() {
  const { count, reconcile } = useCart();
  const hasItems = count > 0;
  const checked = useRef(false);
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => {
    if (!hasItems || checked.current) return;
    checked.current = true;
    const controller = new AbortController();
    fetch("/api/menu", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { categories?: MenuCategoryWithItems[] } | null) => {
        if (!data?.categories) return;
        const available = data.categories.flatMap((category) =>
          category.items.filter((item) => item.isAvailable).map((item) => ({ id: item.id, name: item.name, price: Number(item.price) }))
        );
        const gone = reconcile(available);
        if (gone.length > 0) setRemoved(gone);
      })
      .catch(() => { /* offline or waking up: skip, the server still validates the order */ });
    return () => controller.abort();
  }, [hasItems, reconcile]);

  if (removed.length === 0) return null;
  return (
    <p role="status" className="border border-brass/60 bg-brass/10 px-4 py-3 text-sm text-ink">
      We removed {removed.join(", ")} from your order because {removed.length === 1 ? "it is" : "they are"} no longer available.
    </p>
  );
}
