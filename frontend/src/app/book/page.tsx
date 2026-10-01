/**
 * Book Page (/book)
 *
 * Public reservation page. The page itself is a server component for
 * fast first paint; the interactive form is isolated in BookingForm
 * (client component) per single-responsibility.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { BookingForm } from "@/components/public/BookingForm";

export const metadata = {
  title: "Reserve a Table",
  description: "Request a table at Rock n Logs — tell us the date, time, and party size and we'll confirm personally.",
};

export default function BookPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Reserve</p>
          <h1 className="mt-3 font-display text-4xl text-ink">Request a table</h1>
          <p className="mt-3 text-ink/70">
            Tell us when you&apos;d like to come in. We confirm every request personally, so
            please allow a little time to hear back.
          </p>
          <div className="mt-10">
            <BookingForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
