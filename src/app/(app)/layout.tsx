import Link from "next/link";
import { redirect } from "next/navigation";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { roleLabel } from "@/lib/types";
import { signOutAction } from "../sign-in/actions";
import { switchProfileAction } from "./actions";

const seekerTips = [
  "Fill in your experience and skills. Employers read your profile as your CV.",
  "Apply early. Many employers shortlist in the first few days.",
  "A real employer never asks you for money. Report any post that does.",
];

const employerTips = [
  "Get verified so your posts go live and show the Verified badge.",
  "Say the pay and the town clearly. Clear posts get better applicants.",
  "Shortlist people to see their phone number, then call them.",
];

/**
 * The signed-in app. Needs a person with at least one profile.
 * Desktop: top bar and three columns. Phone: one column and a bottom tab bar.
 * The navigation changes with the active role.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeProfile) redirect(ctx.account?.is_admin ? "/admin" : "/onboarding");

  const profile = ctx.activeProfile;
  const isEmployer = profile.type === "employer";
  const verified = profile.verification_status === "verified";

  const { count: unread } = await ctx.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .is("read_at", null);

  const nav: NavItem[] = isEmployer
    ? [
        { href: "/home", label: "Home", icon: "home" },
        { href: "/posts", label: "My posts", icon: "jobs" },
        { href: "/alerts", label: "Alerts", icon: "alerts", badge: unread ?? 0 },
        { href: "/me", label: "Me", icon: "profile" },
      ]
    : [
        { href: "/home", label: "Home", icon: "home" },
        { href: "/jobs", label: "Jobs", icon: "jobs" },
        { href: "/applications", label: "Applications", icon: "applications" },
        { href: "/alerts", label: "Alerts", icon: "alerts", badge: unread ?? 0 },
        { href: "/me", label: "Me", icon: "profile" },
      ];

  const tips = isEmployer ? employerTips : seekerTips;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-content items-center gap-3 px-4">
          <Link href="/home" className="shrink-0 text-title-md text-primary">
            {brand.name}
          </Link>

          {!isEmployer && (
            <form action="/jobs" role="search" className="relative min-w-0 flex-1 md:max-w-xs">
              <label htmlFor="top-search" className="sr-only">
                Search jobs
              </label>
              <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
              <input
                id="top-search"
                name="q"
                type="search"
                placeholder="Search jobs"
                className="h-11 w-full rounded-pill border border-control bg-bg pr-4 pl-10 text-body placeholder:text-ink-muted"
              />
            </form>
          )}

          <nav aria-label="Main" className="ml-auto hidden h-full md:block">
            <NavLinks items={nav} variant="top" />
          </nav>

          <details className="relative ml-auto md:ml-0">
            <summary
              className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-pill px-2 hover:bg-surface-sunken [&::-webkit-details-marker]:hidden"
              aria-label="Profile menu"
            >
              <RoleBadge role={profile.type} verified={verified} size={32} />
              <Icon name="switch-account" size={20} className="text-ink-muted" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 flex w-72 flex-col gap-1 rounded-lg border border-line bg-surface p-2 shadow-md">
              <p className="px-3 pt-2 text-caption text-ink-muted uppercase">Your profiles</p>
              {ctx.profiles.map((p) => {
                const active = p.id === profile.id;
                return (
                  <form key={p.id} action={switchProfileAction}>
                    <input type="hidden" name="profile_id" value={p.id} />
                    <button
                      type="submit"
                      disabled={active}
                      className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-sunken disabled:cursor-default disabled:bg-primary-soft"
                    >
                      <RoleBadge role={p.type} verified={p.verification_status === "verified"} size={32} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-label">{p.full_name}</span>
                        <span className="text-body-sm text-ink-muted">
                          {roleLabel[p.type]}
                          {active ? " · Active" : ""}
                        </span>
                      </span>
                    </button>
                  </form>
                );
              })}
              {ctx.profiles.length < 3 && (
                <Link href="/onboarding" className="flex min-h-12 items-center rounded-md px-3 text-label text-primary hover:bg-primary-soft">
                  Add another profile
                </Link>
              )}
              <hr className="my-1 border-line" />
              {ctx.account?.is_admin && (
                <Link href="/admin" className="flex min-h-12 items-center rounded-md px-3 text-label hover:bg-surface-sunken">
                  Admin portal
                </Link>
              )}
              <Link href="/verification" className="flex min-h-12 items-center rounded-md px-3 text-label hover:bg-surface-sunken">
                {verified ? "Verification" : "Get verified"}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="flex min-h-12 w-full cursor-pointer items-center rounded-md px-3 text-left text-label hover:bg-surface-sunken">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-content flex-1 grid-cols-1 items-start gap-6 px-4 pt-6 pb-24 md:pb-10 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block" aria-label="Your profile">
          <Card className="flex flex-col items-start gap-3">
            <RoleBadge role={profile.type} verified={verified} size={56} />
            <div className="min-w-0">
              <p className="truncate text-title-sm">{profile.full_name}</p>
              <p className="text-body-sm text-ink-muted">{profile.headline ?? roleLabel[profile.type]}</p>
              {profile.town && <p className="text-body-sm text-ink-muted">{profile.town}</p>}
            </div>
            <p className="text-caption text-ink-muted">
              {verified ? "Verified" : profile.verification_status === "pending" ? "Verification in review" : "Not verified yet"}
            </p>
            <Link href="/me" className={buttonClasses("secondary", true)}>
              View profile
            </Link>
            {!verified && profile.verification_status !== "pending" && (
              <Link href="/verification" className={buttonClasses("ghost", true)}>
                Get verified
              </Link>
            )}
          </Card>
        </aside>

        <main className="flex min-w-0 flex-col gap-6">{children}</main>

        <aside className="hidden lg:block" aria-label="Tips">
          <Card className="flex flex-col gap-3">
            <h2 className="text-title-sm">{isEmployer ? "Hiring tips" : "Tips for you"}</h2>
            <ul className="flex flex-col gap-3">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-body-sm text-ink-muted">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-pill bg-amber" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface shadow-md md:hidden">
        <div className="flex h-16 pb-[env(safe-area-inset-bottom)]">
          <NavLinks items={nav} variant="bottom" />
        </div>
      </nav>
    </>
  );
}
