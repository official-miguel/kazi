"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <ul className={cn("flex", variant === "top" ? "h-full items-stretch gap-1" : "w-full items-stretch justify-around")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={variant === "bottom" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-full min-h-12 flex-col items-center justify-center gap-0.5 px-3 text-caption",
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
