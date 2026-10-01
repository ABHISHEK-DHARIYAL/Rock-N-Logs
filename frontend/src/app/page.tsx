/**
 * Home Page (/)
 *
 * Public landing page. Server component: reads active promotions and
 * featured menu items directly via the service layer (no client fetch
 * needed for a first paint) and renders the hero, promotions, and a
 * teaser of featured dishes.
 */
import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { PromotionBanner } from "@/components/public/PromotionBanner";
import { MenuCard } from "@/components/public/MenuCard";
import { RestaurantStructuredData } from "@/components/public/RestaurantStructuredData";
import { PdfMenuSection } from "@/components/public/PdfMenuSection";
import { api } from "@/lib/api";
import type { MenuItemWithImage, MenuCategoryWithItems, PromotionWithImage } from "@/lib/types";

export default async function HomePage() {
  const [promotions, categories, settings] = await Promise.all([
    api.promotions(),
    api.menu(),
    api.settings(),
  ]);

  const featuredItems = categories
    .flatMap((category: MenuCategoryWithItems) => category.items)
    .filter((item: MenuItemWithImage) => item.isFeatured && item.isAvailable)
    .slice(0, 3);

  return (
    <>
      <RestaurantStructuredData
        name={settings.name}
        description={settings.description ?? settings.tagline}
        address={settings.address}
        phone={settings.phone}
        openingHours={settings.openingHours}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero: the thesis of the page — a warm room, not a menu of features. */}
        <section className="border-b border-line bg-parchment">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-28">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brass">Neighborhood bistro</p>
              <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink md:text-6xl">
                A table is always
                <br />
                being kept warm.
              </h1>
              <p className="mt-6 max-w-md text-ink/70">
                Rock n Logs serves seasonal plates and wood-fired mains in a room built
                for long dinners and returning faces. Come as you are.
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/book"
                  className="rounded-sm bg-ink px-6 py-3 text-sm font-medium text-parchment transition-colors hover:bg-moss"
                >
                  Reserve a table
                </Link>
                <Link
                  href="/menu"
                  className="rounded-sm border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment"
                >
                  View the menu
                </Link>
              </div>
            </div>
            <div className="aspect-[4/5] w-full rounded-sm bg-ink/90" aria-hidden="true" />
          </div>
        </section>

        {promotions.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 py-14">
            <div className="divider-brass mb-8">
              <span className="font-display text-sm uppercase tracking-[0.2em]">Right now</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {promotions.map((promo: PromotionWithImage) => (
                <PromotionBanner key={promo.id} title={promo.title} description={promo.description} />
              ))}
            </div>
          </section>
        )}

        {featuredItems.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 py-14">
            <div className="divider-brass mb-8">
              <span className="font-display text-sm uppercase tracking-[0.2em]">From the kitchen</span>
            </div>
            <div className="grid gap-x-12 md:grid-cols-3">
              {featuredItems.map((item: MenuItemWithImage) => (
                <MenuCard
                  key={item.id}
                  name={item.name}
                  description={item.description}
                  price={`$${Number(item.price).toFixed(2)}`}
                  imageUrl={item.image?.url}
                  isFeatured
                />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 pb-14">
          <PdfMenuSection />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
