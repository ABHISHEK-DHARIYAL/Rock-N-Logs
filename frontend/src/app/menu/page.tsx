/**
 * Menu Page (/menu)
 *
 * Public page rendering the full menu, grouped by category, in menu
 * sort order. Reads directly from MenuService (server component) —
 * unavailable items are filtered out here since this is customer-facing.
 */
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuCard } from "@/components/public/MenuCard";
import { PdfMenuSection } from "@/components/public/PdfMenuSection";
import { api } from "@/lib/api";
import type { MenuItemWithImage } from "@/lib/types";

export const metadata = {
  title: "Menu",
  description: "Seasonal plates and wood-fired mains — see what's on the menu at Rock n Logs tonight.",
};

export default async function MenuPage() {
  const categories = await api.menu();
  const categoriesWithAvailableItems = categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item: MenuItemWithImage) => item.isAvailable),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">The menu</p>
          <h1 className="mt-3 font-display text-4xl text-ink">What&apos;s on tonight</h1>

          <div className="mt-6">
            <PdfMenuSection />
          </div>

          {categoriesWithAvailableItems.length === 0 ? (
            <p className="mt-10 text-ink/60">
              Our menu is being updated. Please check back shortly, or call us for tonight&apos;s offerings.
            </p>
          ) : (
            <div className="mt-12 space-y-14">
              {categoriesWithAvailableItems.map((category) => (
                <div key={category.id}>
                  <h2 className="font-display text-2xl text-ink">{category.name}</h2>
                  <div className="mt-2">
                    {category.items.map((item: MenuItemWithImage) => (
                      <MenuCard
                        key={item.id}
                        name={item.name}
                        description={item.description}
                        price={`$${Number(item.price).toFixed(2)}`}
                        imageUrl={item.image?.url}
                        isFeatured={item.isFeatured}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
