import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { roleLabel, type Role } from "@/lib/types";

/*
 * Role badges. Each role has its own shape and colour:
 * Worker = amber hexagon + spark, Intern = green leaf + sprout,
 * Employer = deep green shield + briefcase. The Verified seal sits on top.
 */

const shapes: Record<Role, ReactNode> = {
  worker: (
    <>
      <polygon
        className="fill-amber stroke-amber-ink"
        strokeWidth="2"
        strokeLinejoin="round"
        points="20,3 34.7,11.5 34.7,28.5 20,37 5.3,28.5 5.3,11.5"
      />
      <path
        className="fill-ink"
        d="M20 11.5c1 5.3 3.2 7.5 8.5 8.5-5.3 1-7.5 3.2-8.5 8.5-1-5.3-3.2-7.5-8.5-8.5 5.3-1 7.5-3.2 8.5-8.5z"
      />
    </>
  ),
  intern: (
    <>
      <path
        className="fill-sprout stroke-sprout-ink"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M20 3h13a4 4 0 0 1 4 4v13c0 9.4-7.6 17-17 17S3 29.400 3 20 10.6 3 20 3z"
      />
      <path className="fill-none stroke-on-primary" strokeWidth="2" strokeLinecap="round" d="M20 29.5V20" />
      <path className="fill-on-primary" d="M20 20.5c0-4.2 3-7.2 7.8-7.200 0 4.2-3 7.2-7.8 7.200z" />
      <path className="fill-on-primary" d="M20 24.5c0-3.3-2.4-5.7-6.3-5.700 0 3.3 2.4 5.7 6.3 5.700z" />
    </>
  ),
  employer: (
    <>
      <path
        className="fill-primary stroke-primary-strong"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M20 3 34 8v10.5c0 8.5-5.6 15-14 18.5C11.6 33.5 6 27 6 18.5V8z"
      />
      <g className="fill-none stroke-on-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="12.5" y="15.5" width="15" height="10.5" rx="2.5" />
        <path d="M17 15.5V14a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 23 14v1.5" />
      </g>
      <circle className="fill-amber" cx="20" cy="20.7" r="1.8" />
    </>
  ),
};

interface VerifiedSealProps {
  size?: number;
  /** Adds a white ring so the seal reads on top of a badge or photo. */
  ring?: boolean;
  label?: string;
  className?: string;
}

export function VerifiedSeal({ size = 18, ring = false, label, className }: VerifiedSealProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ring && <circle className="fill-surface" cx="12" cy="12" r="12" />}
      <rect className="fill-primary" x="4.5" y="4.5" width="15" height="15" rx="4" />
      <rect className="fill-primary" x="4.5" y="4.5" width="15" height="15" rx="4" transform="rotate(45 12 12)" />
      <path
        className="fill-none stroke-on-primary"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.4 12.2 2.4 2.4 4.8-5.1"
      />
    </svg>
  );
}

interface RoleBadgeProps {
  role: Role;
  verified?: boolean;
  /** 24 in lists, 40 on cards and in the account switcher, 64 on the profile header. */
  size?: number;
  className?: string;
}

export function RoleBadge({ role, verified = false, size = 40, className }: RoleBadgeProps) {
  const label = verified ? `Verified ${roleLabel[role].toLowerCase()}` : roleLabel[role];
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="block">
        {shapes[role]}
      </svg>
      {verified && (
        <VerifiedSeal ring size={Math.round(size * 0.44)} className="absolute -right-[6%] -bottom-[6%]" />
      )}
    </span>
  );
}
