"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/format";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Small count shown on the icon, e.g. unread alerts. */
  badge?: number;
}

interface NavLinksProps {
  items: NavItem[];
  /** "top" is the desktop bar, "bottom" is the phone tab bar. */
  variant: "top" | "bottom";
}

export function NavLinks({ items, variant }: NavLinksProps) {
  const pathname = usePathname();

  // Highlight the tapped tab straight away, before the new screen arrives.
  // The tap is remembered together with the page it was made on, so it is
  // ignored automatically once the page has changed.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const current = tapped && tapped.from === pathname ? tapped.href : pathname;

  return (
    <ul className={cn("flex", variant === "top" ? "h-full items-stretch gap-1" : "w-full items-stretch justify-around")}>
      {items.map((item) => {
        const active = current === item.href || current.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={variant === "bottom" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              prefetch
              onClick={() => setTapped({ href: item.href, from: pathname })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-full min-h-12 touch-manipulation flex-col items-center justify-center gap-0.5 px-3 text-caption active:bg-surface-sunken",
                active ? "text-primary" : "text-ink-muted hover:text-ink",
                variant === "top" && "border-b-2",
                variant === "top" && (active ? "border-primary" : "border-transparent"),
              )}
            >
              <span className="relative">
                <Icon name={item.icon} size={variant === "bottom" ? 26 : 24} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 min-w-4 rounded-pill bg-danger px-1 text-center text-[10px] leading-4 font-bold text-on-primary">
                    {item.badge > 9 ? "9+" : item.badge}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
