/**
 * PromotionBanner
 *
 * UI responsibility: displays a single active promotion as a banner card
 * on the home page. Presentational only.
 */
export function PromotionBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-brass/40 bg-brass/10 px-6 py-4">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink/70">{description}</p>
    </div>
  );
}
