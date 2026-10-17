/**
 * BookingForm
 *
 * UI responsibility: collects booking information and submits it to
 * POST /api/bookings. Customers choose between a table-only reservation and a
 * table plus a pre-order of dishes from their cart. Only dish ids and quantities
 * are sent; the server looks up names and prices itself, so the bill can't be
 * tampered with. Validation rules live in BookingService and surface here as
 * error messages returned by the API.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { OrderSummary } from "@/components/public/OrderSummary";
import { CartSync } from "@/components/public/CartSync";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import {
  defaultBookingSlot, earliestBooking, maxBookingDate, minutesToTime, openSpans, toInputParts, validateBookingWhen,
  type BookingSchedule,
} from "@/lib/dates";

type SubmitState = "idle" | "submitting" | "success" | "error";
type Mode = "table" | "preorder";

const MODE_OPTIONS: { value: Mode; title: string; hint: string }[] = [
  { value: "table", title: "Just the table", hint: "Reserve seats only. You can order when you arrive." },
  { value: "preorder", title: "Table + food", hint: "Pick dishes now so they're ready when you arrive." },
];

export function BookingForm() {
  const router = useRouter();
  const cart = useCart();
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // null = customer hasn't chosen yet: default to "Table + food" if they already added dishes.
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const mode: Mode = chosenMode ?? (cart.count > 0 ? "preorder" : "table");
  // Captured once per mount: how long the form existed before submit.
  // Sent to the server as a bot-detection signal (see lib/spamDetection).
  const [formRenderedAt] = useState(() => Date.now());

  const orderIsEmpty = mode === "preorder" && cart.count === 0;

  // Date/time: pre-filled with the earliest bookable slot inside opening hours. Past dates, times
  // outside the hours set in /admin/settings, and too-far-ahead dates can't be chosen.
  // Browser-only values (the user's clock) are computed after mount so server and browser markup match.
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bounds, setBounds] = useState<{ earliest: { date: string; time: string }; maxDate: string } | null>(null);
  const [schedule, setSchedule] = useState<BookingSchedule | null>(null);
  const [openingHours, setOpeningHours] = useState<string | null>(null);
  const [whenError, setWhenError] = useState<string | null>(null);
  const touched = useRef(false); // true once the customer edits the date/time themselves

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    const slot = defaultBookingSlot(now);
    // Intentional: browser-only values (the user's clock/timezone) can only be read after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setBounds({ earliest: toInputParts(earliestBooking(now)), maxDate: maxBookingDate(now) });
    setDate(slot.date);
    setTime(slot.time);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Opening hours come from the server. The form is usable straight away with the defaults
    // above; once the hours arrive the pre-filled slot moves to the first open time.
    fetch("/api/settings", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        const loaded: BookingSchedule | null = data.bookingSchedule ?? null;
        setSchedule(loaded);
        setOpeningHours(data.settings?.openingHours ?? null);
        if (loaded && !touched.current) {
          const fitted = defaultBookingSlot(new Date(), loaded);
          setDate(fitted.date);
          setTime(fitted.time);
        }
      })
      .catch(() => { /* hours unavailable: the server still enforces them */ });
    return () => controller.abort();
  }, []);

  function changeWhen(nextDate: string, nextTime: string) {
    touched.current = true;
    setDate(nextDate);
    setTime(nextTime);
    setWhenError(validateBookingWhen(nextDate, nextTime, schedule, openingHours));
  }

  // Native min/max on the time field: today's earliest time, and the opening span when the day has one.
  let minTime = bounds && date === bounds.earliest.date ? bounds.earliest.time : undefined;
  let maxTime: string | undefined;
  const spans = schedule && date ? openSpans(schedule, date) : [];
  if (spans.length === 1) {
    const open = minutesToTime(spans[0].start);
    if (!minTime || open > minTime) minTime = open;
    maxTime = minutesToTime(spans[0].end - 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (orderIsEmpty) {
      setErrorMessage("Add at least one dish to your order, or choose \u201cJust the table\u201d.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const requested = new Date(`${date}T${time}`);
    const problem = validateBookingWhen(date, time, schedule, openingHours);
    if (problem) {
      setWhenError(problem);
      setErrorMessage(problem);
      setState("error");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("name"),
          customerPhone: formData.get("phone"),
          customerEmail: formData.get("email") || undefined,
          partySize: Number(formData.get("partySize")),
          requestedDate: requested.toISOString(),
          // Exactly what the customer picked, so staff see the same day/time (no timezone shift).
          requestedLocal: `${date}T${time}`,
          specialRequest: formData.get("specialRequest") || undefined,
          // Ids and quantities only: the server decides names and prices.
          preOrderItems: mode === "preorder" ? cart.lines.map((line) => ({ menuItemId: line.id, quantity: line.quantity })) : undefined,
          // Honeypot: real users never see or fill this field.
          website: formData.get("website") || undefined,
          formRenderedAt,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      if (mode === "preorder") cart.clear();
      if (typeof data?.receiptToken === "string") {
        router.push(`/book/receipt/${encodeURIComponent(data.receiptToken)}`);
        return;
      }
      setState("success"); // no receipt token (filtered as spam): show a generic confirmation
    } catch {
      setErrorMessage("We couldn't reach the server. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="border border-moss/40 bg-moss/10 px-6 py-8 text-center">
        <p className="font-display text-2xl text-ink">Request received</p>
        <p className="mt-2 text-ink/70">A member of our team will confirm your table shortly.</p>
        <Button className="mt-6" onClick={() => setState("idle")}>
          Book another table
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot: invisible to sighted and screen-reader users, but
          present in the DOM and unstyled with display:none, so simple
          bots that only skip display:none fields still fill it in. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">What would you like to book?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer border px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brass ${
                mode === option.value ? "border-ink bg-parchment-dim" : "border-line hover:border-ink/50"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setChosenMode(option.value)}
                className="sr-only"
              />
              <span className="block font-medium text-ink">{option.title}</span>
              <span className="mt-0.5 block text-sm text-ink/60">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <CartSync />

      {mode === "preorder" && (
        <section aria-label="Your order">
          <h2 className="mb-2 font-display text-xl text-ink">Your order</h2>
          <OrderSummary />
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" name="name" required maxLength={100} autoComplete="name" />
        <Input label="Phone number" name="phone" type="tel" required maxLength={20} pattern="[+0-9 \(\)\-.]{7,20}" title="Digits, spaces, + ( ) - only" autoComplete="tel" />
      </div>
      <Input label="Email (optional)" name="email" type="email" maxLength={254} autoComplete="email" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Date" name="date" type="date" required min={bounds?.earliest.date} max={bounds?.maxDate} value={date} onChange={(event) => changeWhen(event.target.value, time)} />
        <Input label="Time" name="time" type="time" required min={minTime} max={maxTime} value={time} onChange={(event) => changeWhen(date, event.target.value)} />
        <Input label="Party size" name="partySize" type="number" min={1} max={20} defaultValue={2} required />
      </div>
      {whenError ? (
        <p role="alert" className="-mt-3 text-sm text-rust">{whenError}</p>
      ) : (
        openingHours && schedule && <p className="-mt-3 text-sm text-ink/60">Open: {openingHours}</p>
      )}
      <Textarea label="Special requests (optional)" name="specialRequest" rows={3} maxLength={500} />

      {errorMessage && (
        <p role="alert" className="text-sm text-rust">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={state === "submitting" || orderIsEmpty || Boolean(whenError)} className="w-full sm:w-auto">
        {state === "submitting"
          ? "Sending request…"
          : mode === "preorder" && cart.count > 0
            ? `Request table + order (${formatMoney(cart.total)})`
            : "Request a table"}
      </Button>
    </form>
  );
}
