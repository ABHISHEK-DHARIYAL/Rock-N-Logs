/**
 * StatusBadge
 *
 * UI responsibility: a small colored label communicating state (booking
 * status, item availability). Centralizes the color mapping so status
 * meaning stays consistent everywhere it appears.
 */
type Tone = "neutral" | "positive" | "warning" | "negative";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-parchment-dim text-ink",
  positive: "bg-moss/15 text-moss",
  warning: "bg-brass/20 text-brass",
  negative: "bg-rust/15 text-rust",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
