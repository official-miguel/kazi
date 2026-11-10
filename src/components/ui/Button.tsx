import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-pill px-6 text-label transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary: "border border-control bg-surface text-ink hover:bg-surface-sunken",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "border border-danger bg-surface text-danger hover:bg-danger-soft",
};

/** Class names for a button look. Use on a <Link> when the action is navigation. */
export function buttonClasses(variant: Variant = "primary", fullWidth = false, className?: string): string {
  return cn(base, variants[variant], fullWidth && "w-full", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/** One primary button per screen. Everything tappable is at least 48px tall. */
export function Button({ variant = "primary", fullWidth = false, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, fullWidth, className)} {...props} />;
}
