/**
 * Admin Bookings Page (/admin/bookings)
 *
 * UI responsibility: lets staff review reservation requests and move
 * them through PENDING → CONFIRMED/CANCELLED → COMPLETED. Status changes
 * go through PATCH /api/admin/bookings/[id], which triggers customer
 * notifications server-side (see BookingService.updateStatus).
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MenuItemPicker, type PickedLine } from "@/components/public/MenuItemPicker";
import { formatMoney } from "@/lib/money";
import { formatBookingWhen } from "@/lib/dates";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  partySize: number;
  requestedDate: string;
  requestedLocal: string | null;
  status: BookingStatus;
  specialRequest: string | null;
  preOrderItems: { id: string; menuItemName: string; quantity: number; priceAtOrder: string | number }[];
  preOrderTotal: string;
}

const STATUS_TONE: Record<BookingStatus, "neutral" | "positive" | "warning" | "negative"> = {
  PENDING: "warning",
  CONFIRMED: "positive",
  CANCELLED: "negative",
  COMPLETED: "neutral",
};

const FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Completed", value: "COMPLETED" },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<Booking | null>(null);
  const [addLines, setAddLines] = useState<PickedLine[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadBookings = useCallback(async (status: BookingStatus | "ALL") => {
    setLoading(true);
    const query = status === "ALL" ? "" : `?status=${status}`;
    const response = await fetch(`/api/admin/bookings${query}`);
    const data = await response.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount/filter
    // change, which necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings(filter);
  }, [filter, loadBookings]);

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    loadBookings(filter);
  }

  function closeAddModal() {
    setAddTarget(null);
    setAddLines([]);
    setAddError(null);
  }

  async function submitAddItems() {
    if (!addTarget || addLines.length === 0) return;
    setAddSaving(true);
    setAddError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${addTarget.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: addLines }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setAddError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      closeAddModal();
      loadBookings(filter);
    } catch {
      setAddError("Couldn't reach the server. Please try again.");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Bookings</h1>
      <p className="mt-1 text-ink/60">Confirm, cancel, or mark reservations complete.</p>

      <div className="mt-6 flex gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ${
              filter === option.value ? "bg-ink text-parchment" : "bg-parchment-dim text-ink/70"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-ink/60">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="mt-8 text-ink/60">No bookings in this view.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-ink">{booking.customerName}</p>
                  <StatusBadge label={booking.status} tone={STATUS_TONE[booking.status]} />
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  Party of {booking.partySize} · {formatBookingWhen(booking.requestedLocal, booking.requestedDate)} ·{" "}
                  {booking.customerPhone}
                </p>
                {booking.preOrderItems?.length > 0 ? (
                  <div className="mt-2 border-l-2 border-brass pl-3 text-sm text-ink/80">
                    <p className="font-medium text-ink">Pre-order · {formatMoney(booking.preOrderTotal)}</p>
                    <ul>
                      {booking.preOrderItems.map((item) => (
                        <li key={item.id}>{item.quantity} × {item.menuItemName}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink/40">Table only</p>
                )}
                {booking.specialRequest && (
                  <p className="mt-1 text-sm italic text-ink/50">&ldquo;{booking.specialRequest}&rdquo;</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                  <Button
                    variant="ghost"
                    disabled={updatingId === booking.id}
                    onClick={() => { setAddTarget(booking); setAddLines([]); setAddError(null); }}
                  >
                    Add items
                  </Button>
                )}
                {booking.status === "PENDING" && (
                  <>
                    <Button
                      variant="secondary"
                      disabled={updatingId === booking.id}
                      onClick={() => updateStatus(booking.id, "CONFIRMED")}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={updatingId === booking.id}
                      onClick={() => updateStatus(booking.id, "CANCELLED")}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {booking.status === "CONFIRMED" && (
                  <>
                    <Button
                      variant="secondary"
                      disabled={updatingId === booking.id}
                      onClick={() => updateStatus(booking.id, "COMPLETED")}
                    >
                      Mark completed
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={updatingId === booking.id}
                      onClick={() => updateStatus(booking.id, "CANCELLED")}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(addTarget)} onClose={closeAddModal} title={`Add items — ${addTarget?.customerName ?? ""}`}>
        {addTarget && (
          <div>
            <MenuItemPicker key={addTarget.id} onChange={setAddLines} disabled={addSaving} />
            {addError && <p role="alert" className="mt-3 text-sm text-rust">{addError}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeAddModal} disabled={addSaving}>Cancel</Button>
              <Button onClick={submitAddItems} disabled={addSaving || addLines.length === 0}>
                {addSaving ? "Adding…" : "Add to order"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
