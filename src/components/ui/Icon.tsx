import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/*
 * The Kazi icon set. 24px grid, rounded 1.75px outline in the current text
 * colour, plus one small amber fill ("accent"). Do not add icons from other sets.
 */

const accent = "fill-amber stroke-none";
const seal = "fill-primary stroke-none";

const paths = {
  home: (
    <>
      <rect className={accent} x="9.5" y="13" width="5" height="7" rx="1.5" />
      <path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </>
  ),
  jobs: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="3" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <circle className={accent} cx="12" cy="13.5" r="2.2" />
    </>
  ),
  attachments: (
    <>
      <path d="M12 5 3 9.5l9 4.5 9-4.5z" />
      <path d="M7 12v4c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4" />
      <path d="M20.5 10v3.2" />
      <circle className={accent} cx="20.5" cy="15.5" r="1.9" />
    </>
  ),
  applications: (
    <>
      <path d="M7 3.5h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M14 3.5v4h4" />
      <circle className={accent} cx="11.5" cy="14.5" r="3.4" />
      <path d="m10 14.6 1.1 1.1 2-2.2" />
    </>
  ),
  alerts: (
    <>
      <path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2H5z" />
      <path d="M10.2 20.2a1.9 1.9 0 0 0 3.6 0" />
      <circle className={accent} cx="18.2" cy="5.8" r="2.3" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle className={accent} cx="12" cy="10" r="2.8" />
      <circle cx="12" cy="10" r="2.8" />
      <path d="M6.8 18.2c1-2.2 2.9-3.4 5.2-3.4s4.2 1.2 5.2 3.4" />
    </>
  ),
  search: (
    <>
      <circle className={accent} cx="11" cy="11" r="3" />
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z" />
      <circle className={accent} cx="12" cy="10.5" r="2.5" />
    </>
  ),
  verified: (
    <>
      <rect className={seal} x="4.5" y="4.5" width="15" height="15" rx="4" />
      <rect className={seal} x="4.5" y="4.5" width="15" height="15" rx="4" transform="rotate(45 12 12)" />
      <path className="stroke-on-primary" strokeWidth="2" d="m8.4 12.2 2.4 2.4 4.8-5.1" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle className={accent} cx="9" cy="7" r="2.2" />
      <circle cx="9" cy="7" r="2.2" />
      <circle className={accent} cx="15" cy="12" r="2.2" />
      <circle cx="15" cy="12" r="2.2" />
      <circle className={accent} cx="8" cy="17" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </>
  ),
  "switch-account": (
    <>
      <circle className={accent} cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M13.5 6.5h3a2 2 0 0 1 2 2v2" />
      <path d="m16.8 9 1.7 1.7L20.2 9" />
      <path d="M10.5 17.5h-3a2 2 0 0 1-2-2v-2" />
      <path d="m3.8 15 1.7-1.7L7.2 15" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as IconName[];

interface IconProps {
  name: IconName;
  /** Pixel size. 24 by default, 20 in chips, 28 in the mobile tab bar. */
  size?: number;
  /** Give a label only when the icon stands alone. Next to text, leave it out. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 24, label, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  );
}
