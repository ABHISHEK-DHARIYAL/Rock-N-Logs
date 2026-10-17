/**
 * AddToCart: "Add" button that becomes a quantity stepper once the dish is in the order.
 */
"use client";

import { MAX_QTY_PER_ITEM, useCart } from "@/lib/cart";

interface AddToCartProps {
  id: string;
  name: string;
  price: number;
}

const STEP_BUTTON =
  "h-8 w-8 rounded-sm border border-ink text-ink transition-colors hover:bg-ink hover:text-parchment disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

export function AddToCart({ id, name, price }: AddToCartProps) {
  const { lines, add, setQuantity } = useCart();
  const quantity = lines.find((line) => line.id === id)?.quantity ?? 0;

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => add({ id, name, price })}
        aria-label={`Add ${name} to your order`}
        className="rounded-sm border border-ink px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Add to order
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-3" role="group" aria-label={`${name} quantity`}>
      <button type="button" className={STEP_BUTTON} onClick={() => setQuantity(id, quantity - 1)} aria-label={`Remove one ${name}`}>
        −
      </button>
      <span className="min-w-6 text-center font-medium text-ink" aria-live="polite">{quantity}</span>
      <button
        type="button"
        className={STEP_BUTTON}
        onClick={() => setQuantity(id, quantity + 1)}
        disabled={quantity >= MAX_QTY_PER_ITEM}
        aria-label={`Add one more ${name}`}
      >
        +
      </button>
    </div>
  );
}
