/**
 * MenuItemPicker: loads the live menu and lets the user choose quantities of available dishes.
 * Used to add dishes to an order that was already placed (customer receipt page and admin
 * bookings page). Reports the selection as [{ menuItemId, quantity }]; prices are only shown for
 * an estimate — the server prices the order from the database.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { MenuCategoryWithItems } from "@/lib/types";

export interface PickedLine { menuItemId: string; quantity: number }

const MAX_QTY = 20; // mirrors the server's per-dish limit
const STEP_BUTTON =
  "h-7 w-7 rounded-sm border border-ink text-ink transition-colors hover:bg-ink hover:text-parchment disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

export function MenuItemPicker({ onChange, disabled = false }: { onChange: (lines: PickedLine[]) => void; disabled?: boolean }) {
  const [categories, setCategories] = useState<MenuCategoryWithItems[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/menu", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data?.categories)) return setFailed(true);
        const withAvailable = (data.categories as MenuCategoryWithItems[])
          .map((category) => ({ ...category, items: category.items.filter((item) => item.isAvailable) }))
          .filter((category) => category.items.length > 0);
        setCategories(withAvailable);
      })
      .catch((error) => { if (error?.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    onChange(Object.entries(quantities).map(([menuItemId, quantity]) => ({ menuItemId, quantity })));
  }, [quantities, onChange]);

  const estimate = useMemo(() => {
    if (!categories) return 0;
    const prices = new Map(categories.flatMap((category) => category.items.map((item) => [item.id, Math.round(Number(item.price) * 100)] as const)));
    return Object.entries(quantities).reduce((sum, [id, quantity]) => sum + (prices.get(id) ?? 0) * quantity, 0) / 100;
  }, [categories, quantities]);
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);

  function setQuantity(id: string, quantity: number) {
    setQuantities((previous) => {
      const next = { ...previous };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(quantity, MAX_QTY);
      return next;
    });
  }

  if (failed) return <p role="alert" className="text-sm text-rust">Couldn&apos;t load the menu. Please close this and try again.</p>;
  if (!categories) return <p className="text-sm text-ink/60" role="status">Loading menu…</p>;
  if (categories.length === 0) return <p className="text-sm text-ink/60">No dishes are available right now.</p>;

  return (
    <div>
      <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="font-display text-base text-ink">{category.name}</h3>
            <ul className="mt-1 divide-y divide-line">
              {category.items.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-ink/60">{formatMoney(item.price)}</p>
                    </div>
                    <div className="inline-flex items-center gap-2" role="group" aria-label={`${item.name} quantity`}>
                      <button type="button" className={STEP_BUTTON} disabled={disabled || quantity === 0} onClick={() => setQuantity(item.id, quantity - 1)} aria-label={`Remove one ${item.name}`}>−</button>
                      <span className="min-w-5 text-center text-sm text-ink" aria-live="polite">{quantity}</span>
                      <button type="button" className={STEP_BUTTON} disabled={disabled || quantity >= MAX_QTY} onClick={() => setQuantity(item.id, quantity + 1)} aria-label={`Add one ${item.name}`}>+</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink/70">
        {count === 0 ? "Nothing selected yet." : `Adding ${count} ${count === 1 ? "item" : "items"} · ${formatMoney(estimate)}`}
      </p>
    </div>
  );
}
