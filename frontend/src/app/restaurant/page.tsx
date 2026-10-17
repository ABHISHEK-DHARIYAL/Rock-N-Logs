/**
 * Restaurant / Our Story Page (/restaurant)
 *
 * Public page. Static editorial content plus live hours/address pulled
 * from RestaurantSettings, so staff can update contact details from
 * /admin without a code change.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { api } from "@/lib/api";

export const metadata = {
  title: "Our Story",
  description:
    "The story behind Rock n Logs — a neighborhood bistro built around a wood-fired hearth, a short seasonal menu, and a room made for long dinners.",
};

export default async function RestaurantPage() {
  const settings = await api.settings();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Our story</p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            {settings.tagline ?? "Cooking the way our neighborhood eats."}
          </h1>
          <div className="mt-8 space-y-5 text-ink/80 leading-relaxed">
            <p>
              {settings.description ??
                "Rock n Logs opened with one idea: a restaurant that feels like it has always been here. We cook with a wood-fired hearth at the center of the room, a short menu that changes with what's good that week, and a wine list built for arguing over."}
            </p>
            <p>
              We keep the dining room small on purpose — every table gets a server who knows
              the menu by heart and isn&apos;t in a hurry to turn the table.
            </p>
          </div>

          <div className="divider-brass my-10">
            <span className="font-display text-sm uppercase tracking-[0.2em]">Visit</span>
          </div>

          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-wide text-ink/50">Address</dt>
              <dd className="mt-1 text-ink">{settings.address ?? "118 Elm Street"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-ink/50">Hours</dt>
              <dd className="mt-1 text-ink">{settings.openingHours ?? "Tue–Sun, 5pm–11pm"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-ink/50">Phone</dt>
              <dd className="mt-1 text-ink">{settings.phone ?? "(555) 019-2244"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-ink/50">Email</dt>
              <dd className="mt-1 text-ink">{settings.email ?? "hello@rocknlogs.example"}</dd>
            </div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
