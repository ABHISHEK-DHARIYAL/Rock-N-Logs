/**
 * OrderSummary: editable list of the dishes in the cart with a running total.
 * Totals shown here are an estimate; the authoritative bill is priced by the server.
 */
"use client";

import Link from "next/link";
import { MAX_QTY_PER_ITEM, useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

const STEP_BUTTON =
  "h-7 w-7 rounded-sm border border-ink text-ink transition-colors hover:bg-ink hover:text-parchment disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

export function OrderSummary() {
  const { lines, total, setQuantity } = useCart();

  if (lines.length === 0) {
    return (
      <div className="border border-dashed border-line px-5 py-6 text-center">
        <p className="text-ink/70">Your order is empty.</p>
        <Link href="/menu" className="mt-2 inline-block text-sm font-medium text-brass underline underline-offset-4">
          Browse the menu and add dishes
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-line">
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{line.name}</p>
              <p className="text-sm text-ink/60">{formatMoney(line.price)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2" role="group" aria-label={`${line.name} quantity`}>
                <button type="button" className={STEP_BUTTON} onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label={`Remove one ${line.name}`}>−</button>
                <span className="min-w-5 text-center text-ink">{line.quantity}</span>
                <button type="button" className={STEP_BUTTON} onClick={() => setQuantity(line.id, line.quantity + 1)} disabled={line.quantity >= MAX_QTY_PER_ITEM} aria-label={`Add one more ${line.name}`}>+</button>
              </div>
              <span className="w-20 text-right font-display text-ink">{formatMoney(line.price * line.quantity)}</span>
              <button type="button" onClick={() => setQuantity(line.id, 0)} className="text-sm text-rust underline-offset-2 hover:underline" aria-label={`Remove ${line.name} from your order`}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line bg-parchment-dim px-4 py-3">
        <span className="font-medium text-ink">Estimated total</span>
        <span className="font-display text-xl text-ink">{formatMoney(total)}</span>
      </div>
      <p className="px-4 py-2 text-xs text-ink/60">
        <Link href="/menu" className="underline underline-offset-2">Add more dishes</Link> · Taxes and service charges, if any, are settled at the restaurant.
      </p>
    </div>
  );
}
