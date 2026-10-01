/**
 * Button
 *
 * UI responsibility: a single consistently-styled button with variants,
 * used across public and admin surfaces. Centralizing this avoids
 * duplicated button CSS across every form and page.
 */
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink text-parchment hover:bg-moss",
  secondary: "bg-transparent text-ink border border-ink hover:bg-ink hover:text-parchment",
  ghost: "bg-transparent text-ink hover:bg-parchment-dim",
  danger: "bg-rust text-parchment hover:opacity-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-medium tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
