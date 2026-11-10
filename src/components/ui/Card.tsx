import type { HTMLAttributes } from "react";
import { cn } from "@/lib/format";

/** A white surface on the cream page. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 rounded-lg border border-line bg-surface p-4 shadow-sm md:p-5", className)}
      {...props}
    />
  );
}
