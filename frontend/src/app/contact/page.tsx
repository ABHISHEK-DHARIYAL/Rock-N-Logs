/**
 * Contact Page (/contact)
 *
 * Public page with contact details sourced from RestaurantSettings.
 * No contact form here by design — reservations go through /book, and a
 * generic contact form would just duplicate that flow with less structure.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { api } from "@/lib/api";

export const metadata = {
  title: "Contact",
  description: "Phone, email, address, and hours for Rock n Logs.",
};

export default async function ContactPage() {
  const settings = await api.settings();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Contact</p>
          <h1 className="mt-3 font-display text-4xl text-ink">Get in touch</h1>
          <p className="mt-4 text-ink/70">
            For parties larger than 20, private events, or anything else, reach us directly —
            we&apos;re quick to respond.
          </p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm uppercase tracking-wide text-ink/50">Phone</dt>
              <dd className="mt-1 font-display text-xl text-ink">{settings.phone ?? "(555) 019-2244"}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wide text-ink/50">Email</dt>
              <dd className="mt-1 font-display text-xl text-ink">
                {settings.email ?? "hello@rocknlogs.example"}
              </dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wide text-ink/50">Address</dt>
              <dd className="mt-1 text-ink">{settings.address ?? "118 Elm Street"}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wide text-ink/50">Hours</dt>
              <dd className="mt-1 text-ink">{settings.openingHours ?? "Tue–Sun, 5pm–11pm"}</dd>
            </div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
