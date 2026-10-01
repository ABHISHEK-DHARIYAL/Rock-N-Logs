/**
 * Terms of Use Page (/terms)
 *
 * IMPORTANT: same caveat as privacy/page.tsx — a plain-language starting
 * template, not legal advice. Have it reviewed before relying on it.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { api } from "@/lib/api";

export const metadata = {
  title: "Terms of Use",
  robots: { index: false, follow: true },
};

export default async function TermsPage() {
  const settings = await api.settings();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Legal</p>
          <h1 className="mt-3 font-display text-4xl text-ink">Terms of Use</h1>
          <p className="mt-2 text-sm text-ink/50">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-10 space-y-8 text-ink/80">
            <div>
              <h2 className="font-display text-xl text-ink">Reservations</h2>
              <p className="mt-2 leading-relaxed">
                Submitting a table request through this site is a request, not a guaranteed
                booking — a member of our team confirms every reservation individually. We
                reserve the right to decline a request, including for parties larger than we
                can accommodate at the requested time.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">Accurate information</h2>
              <p className="mt-2 leading-relaxed">
                Please provide accurate contact details when booking — we use them solely to
                confirm and manage your reservation.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">Site content</h2>
              <p className="mt-2 leading-relaxed">
                Menu items, prices, and hours are subject to change without notice. We do our
                best to keep this site current, but please call ahead for anything
                time-sensitive.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">Contact us</h2>
              <p className="mt-2 leading-relaxed">
                Questions about these terms? Reach us at{" "}
                {settings.email ?? "hello@rocknlogs.example"}
                {settings.phone ? ` or ${settings.phone}` : ""}.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
