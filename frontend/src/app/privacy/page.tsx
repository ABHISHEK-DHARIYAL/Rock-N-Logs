/**
 * Privacy Policy Page (/privacy)
 *
 * IMPORTANT: this is a plain-language starting template describing what
 * the app itself actually does with data (booking details, notification
 * delivery) — it is NOT legal advice and does not by itself satisfy
 * GDPR/CCPA/other regional requirements. Have this reviewed by someone
 * qualified for your jurisdiction before relying on it, especially if
 * you add analytics, marketing cookies, or serve customers outside the
 * US. Restaurant name and contact pulled from RestaurantSettings so this
 * stays accurate as those change.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { api } from "@/lib/api";

export const metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: true },
};

export default async function PrivacyPage() {
  const settings = await api.settings();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Legal</p>
          <h1 className="mt-3 font-display text-4xl text-ink">Privacy Policy</h1>
          <p className="mt-2 text-sm text-ink/50">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-10 space-y-8 text-ink/80">
            <div>
              <h2 className="font-display text-xl text-ink">What we collect</h2>
              <p className="mt-2 leading-relaxed">
                When you request a table through our booking form, we collect your name,
                phone number, and (optionally) your email address and any special requests
                you share. We use this only to manage your reservation.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">How we use it</h2>
              <p className="mt-2 leading-relaxed">
                Your booking details are used to confirm your reservation, contact you about
                changes, and prepare for your visit. If you provide a phone number, we may
                send a booking confirmation via WhatsApp. We do not sell or share your
                information with third parties for marketing purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">How long we keep it</h2>
              <p className="mt-2 leading-relaxed">
                We retain booking records for our own operational and record-keeping needs.
                If you&apos;d like your information removed, contact us using the details
                below and we&apos;ll take care of it.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">Cookies</h2>
              <p className="mt-2 leading-relaxed">
                This site does not use tracking or advertising cookies. Your admin session
                (staff only) is stored in a single functional cookie required to keep you
                signed in.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl text-ink">Contact us</h2>
              <p className="mt-2 leading-relaxed">
                Questions about your data? Reach us at{" "}
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
