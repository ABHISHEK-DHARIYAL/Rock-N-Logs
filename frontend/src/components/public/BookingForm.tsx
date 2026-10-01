/**
 * BookingForm
 *
 * UI responsibility: collects booking information and submits it to
 * POST /api/bookings. Owns only form state and submission — the actual
 * validation rules (party size limits, lead time) live in BookingService
 * and are surfaced here purely as error messages returned by the API.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function BookingForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Captured once per mount: how long the form existed before submit.
  // Sent to the server as a bot-detection signal (see lib/spamDetection).
  const [formRenderedAt] = useState(() => Date.now());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("name"),
          customerPhone: formData.get("phone"),
          customerEmail: formData.get("email") || undefined,
          partySize: Number(formData.get("partySize")),
          requestedDate: new Date(`${date}T${time}`).toISOString(),
          specialRequest: formData.get("specialRequest") || undefined,
          // Honeypot: real users never see or fill this field.
          website: formData.get("website") || undefined,
          formRenderedAt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
      form.reset();
    } catch {
      setErrorMessage("We couldn't reach the server. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="border border-moss/40 bg-moss/10 px-6 py-8 text-center">
        <p className="font-display text-2xl text-ink">Request received</p>
        <p className="mt-2 text-ink/70">
          We&apos;ve sent a confirmation to your phone. A member of our team will confirm your table shortly.
        </p>
        <Button className="mt-6" onClick={() => setState("idle")}>
          Book another table
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot: invisible to sighted and screen-reader users, but
          present in the DOM and unstyled with display:none, so simple
          bots that only skip display:none fields still fill it in. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" name="name" required autoComplete="name" />
        <Input label="Phone number" name="phone" type="tel" required autoComplete="tel" />
      </div>
      <Input label="Email (optional)" name="email" type="email" autoComplete="email" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Date" name="date" type="date" required />
        <Input label="Time" name="time" type="time" required />
        <Input label="Party size" name="partySize" type="number" min={1} max={20} defaultValue={2} required />
      </div>
      <Textarea label="Special requests (optional)" name="specialRequest" rows={3} />

      {errorMessage && (
        <p role="alert" className="text-sm text-rust">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={state === "submitting"} className="w-full sm:w-auto">
        {state === "submitting" ? "Sending request…" : "Request a table"}
      </Button>
    </form>
  );
}
