/**
 * ReceiptView: the customer's booking confirmation and bill.
 *
 * Fetched in the browser (not in a server component) so the API's per-IP rate limit sees the
 * customer's own address rather than the Vercel server's. The URL token is the only credential,
 * so keep the link private; the API returns a trimmed view (masked phone, no email).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddMoreDishes } from "@/components/public/AddMoreDishes";
import { formatMoney } from "@/lib/money";
import { formatBookingWhen } from "@/lib/dates";
import type { BookingReceipt } from "@/lib/types";

type View = { kind: "loading" } | { kind: "ready"; receipt: BookingReceipt } | { kind: "missing" } | { kind: "error"; message: string };

const TONE = { PENDING: "warning", CONFIRMED: "positive", CANCELLED: "negative", COMPLETED: "neutral" } as const;
const STATUS_TEXT: Record<BookingReceipt["status"], string> = {
  PENDING: "Request received. We'll confirm your table shortly.",
  CONFIRMED: "Your table is confirmed. See you soon!",
  CANCELLED: "This booking was cancelled. Contact us if that's unexpected.",
  COMPLETED: "Thanks for dining with us.",
};

export function ReceiptView({ token }: { token: string }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/bookings/receipt/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.ok && data?.receipt) return setView({ kind: "ready", receipt: data.receipt });
        if (response.status === 404) return setView({ kind: "missing" });
        if (response.status === 429) return setView({ kind: "error", message: "Too many requests. Please wait a minute and try again." });
        setView({ kind: "error", message: "The server isn't responding yet. It may be waking up — try again in a few seconds." });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setView({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
      });
    return () => controller.abort();
  }, [token, attempt]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the address bar still has the link */
    }
  }, []);

  if (view.kind === "loading") return <p className="text-ink/60" role="status">Fetching your booking…</p>;

  if (view.kind === "missing") {
    return (
      <div className="border border-line px-6 py-8 text-center">
        <p className="font-display text-2xl text-ink">Booking not found</p>
        <p className="mt-2 text-ink/70">Check that you opened the full link you were given.</p>
        <Link href="/book" className="mt-5 inline-block text-sm font-medium text-brass underline underline-offset-4">Make a new booking</Link>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div role="alert" className="border border-rust/40 px-6 py-8 text-center">
        <p className="text-ink/80">{view.message}</p>
        <Button className="mt-5" variant="secondary" onClick={() => { setView({ kind: "loading" }); setAttempt((n) => n + 1); }}>Try again</Button>
      </div>
    );
  }

  const { receipt } = view;
  return (
    <article className="space-y-8">
      <header className="border border-moss/40 bg-moss/10 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink">Your booking</h1>
          <StatusBadge label={receipt.status} tone={TONE[receipt.status]} />
        </div>
        <p className="mt-2 text-ink/70">{STATUS_TEXT[receipt.status]}</p>
        <p className="mt-3 text-sm text-ink/60">Reference <span className="font-mono font-medium text-ink">{receipt.reference}</span></p>
      </header>

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt className="text-ink/50">Name</dt><dd className="text-ink">{receipt.customerName}</dd></div>
        <div><dt className="text-ink/50">Phone</dt><dd className="text-ink">{receipt.maskedPhone}</dd></div>
        <div><dt className="text-ink/50">When</dt><dd className="text-ink">{formatBookingWhen(receipt.requestedLocal, receipt.requestedDate)}</dd></div>
        <div><dt className="text-ink/50">Party size</dt><dd className="text-ink">{receipt.partySize}</dd></div>
        {receipt.specialRequest && (
          <div className="sm:col-span-2"><dt className="text-ink/50">Special requests</dt><dd className="whitespace-pre-line text-ink">{receipt.specialRequest}</dd></div>
        )}
      </dl>

      <section aria-label="Bill">
        <h2 className="font-display text-xl text-ink">Your bill</h2>
        {receipt.hasPreOrder ? (
          <div className="mt-3 border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-parchment-dim text-ink/60">
                <tr><th className="px-4 py-2 font-medium">Dish</th><th className="px-2 py-2 text-right font-medium">Qty</th><th className="px-2 py-2 text-right font-medium">Price</th><th className="px-4 py-2 text-right font-medium">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {receipt.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className="px-4 py-2.5 text-ink">{item.name}</td>
                    <td className="px-2 py-2.5 text-right text-ink">{item.quantity}</td>
                    <td className="px-2 py-2.5 text-right text-ink/70">{formatMoney(item.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right text-ink">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line">
                <tr><td colSpan={3} className="px-4 py-2 text-ink/70">Subtotal</td><td className="px-4 py-2 text-right text-ink">{formatMoney(receipt.subtotal)}</td></tr>
                <tr className="bg-parchment-dim"><td colSpan={3} className="px-4 py-3 font-medium text-ink">Total</td><td className="px-4 py-3 text-right font-display text-lg text-ink">{formatMoney(receipt.total)}</td></tr>
              </tfoot>
            </table>
            <p className="px-4 py-3 text-xs text-ink/60">
              Prices are as of your booking. Taxes, service charges and any changes you make at the restaurant are settled on the day. Pay at the restaurant.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-ink/70">Table only. You didn&apos;t pre-order any food; you can order when you arrive.</p>
        )}
      </section>

      {(receipt.status === "PENDING" || receipt.status === "CONFIRMED") && (
        <AddMoreDishes token={token} onAdded={(updated) => setView({ kind: "ready", receipt: updated })} />
      )}

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>Print / save as PDF</Button>
        <Button variant="ghost" onClick={copyLink}>{copied ? "Link copied" : "Copy link"}</Button>
        <p className="w-full text-xs text-ink/60">Keep this link private. It&apos;s the only way to view this bill again, and anyone with it can see these details.</p>
      </div>
    </article>
  );
}
