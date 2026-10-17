/**
 * Money formatting. Currency and locale are configurable so the same build works for
 * any market (e.g. NEXT_PUBLIC_CURRENCY=INR NEXT_PUBLIC_LOCALE=en-IN). Defaults keep the
 * original "$12.00" look.
 */
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-US";

let formatter: Intl.NumberFormat | null = null;

export function formatMoney(amount: number | string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  try {
    formatter ??= new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
    return formatter.format(value);
  } catch {
    return `$${value.toFixed(2)}`; // invalid currency/locale env value
  }
}
