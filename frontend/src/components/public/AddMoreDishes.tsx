/**
 * AddMoreDishes: lets a customer add dishes to an order they already placed, from their private
 * receipt page. The secret token in the URL is the credential; the server re-prices everything
 * and returns the updated bill.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MenuItemPicker, type PickedLine } from "@/components/public/MenuItemPicker";
import type { BookingReceipt } from "@/lib/types";

export function AddMoreDishes({ token, onAdded }: { token: string; onAdded: (receipt: BookingReceipt) => void }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function submit() {
    if (lines.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/receipt/${encodeURIComponent(token)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.receipt) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      onAdded(data.receipt as BookingReceipt);
      setLines([]);
      setPickerKey((key) => key + 1);
      setOpen(false);
      setAdded(true);
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Add dishes" className="border border-line px-5 py-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Want something more?</h2>
          <p className="text-sm text-ink/70">Add dishes to this order. Your bill updates straight away.</p>
        </div>
        {!open && <Button variant="secondary" onClick={() => { setAdded(false); setOpen(true); }}>Add dishes</Button>}
      </div>
      {added && !open && <p role="status" className="mt-3 text-sm text-moss">Dishes added. Your bill above is up to date.</p>}

      {open && (
        <div className="mt-4">
          <MenuItemPicker key={pickerKey} onChange={setLines} disabled={saving} />
          {error && <p role="alert" className="mt-3 text-sm text-rust">{error}</p>}
          <div className="mt-4 flex gap-3">
            <Button onClick={submit} disabled={saving || lines.length === 0}>{saving ? "Adding…" : "Add to my order"}</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setError(null); }} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
