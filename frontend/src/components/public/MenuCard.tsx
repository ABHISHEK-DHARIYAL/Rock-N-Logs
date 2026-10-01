/**
 * MenuCard
 *
 * UI responsibility: displays a single menu item (name, description,
 * price, optional image) on the public /menu page. Purely presentational
 * — receives fully-formed data, does not fetch anything itself.
 */
import Image from "next/image";

interface MenuCardProps {
  name: string;
  description: string;
  price: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
}

export function MenuCard({ name, description, price, imageUrl, isFeatured }: MenuCardProps) {
  return (
    <div className="flex gap-4 border-b border-line py-5 last:border-none">
      {imageUrl && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-parchment-dim">
          <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg text-ink">
            {name}
            {isFeatured && <span className="ml-2 text-xs uppercase tracking-wide text-brass">Chef&apos;s pick</span>}
          </h3>
          <span className="whitespace-nowrap font-display text-lg text-brass">{price}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink/70">{description}</p>
      </div>
    </div>
  );
}
