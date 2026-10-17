/**
 * Receipt Page (/book/receipt/[token])
 *
 * The customer's booking confirmation and bill, reached via the private link returned when
 * they submit a booking. Never indexed (see robots.ts and metadata below).
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ReceiptView } from "@/components/public/ReceiptView";

export const metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <ReceiptView token={token} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
