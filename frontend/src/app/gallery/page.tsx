/**
 * Gallery Page (/gallery)
 *
 * Public page rendering the curated photo gallery. Server component,
 * reads directly from GalleryService.
 */
import Image from "next/image";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { api } from "@/lib/api";

export const metadata = {
  title: "Gallery",
  description: "A look inside Rock n Logs — the room, the plates, and the people who fill it.",
};

export default async function GalleryPage() {
  const photos = await api.gallery();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-brass">Gallery</p>
          <h1 className="mt-3 font-display text-4xl text-ink">The room, the plates, the people</h1>

          {photos.length === 0 ? (
            <p className="mt-10 text-ink/60">
              Our gallery is still being curated. Check back soon for a look inside.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-sm bg-parchment-dim">
                  <Image
                    src={photo.image.url}
                    alt={photo.caption ?? "Rock n Logs"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
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
