import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { getFullProfile } from "@/lib/data";
import { roleLabel } from "@/lib/types";
import { signOutAction } from "../../sign-in/actions";
import { switchProfileAction } from "../actions";

export const metadata: Metadata = { title: "My profile" };

export default async function MePage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = await getFullProfile(ctx.supabase, ctx.activeProfile.id);
  if (!profile) redirect("/onboarding");

  return (
    <>
      <ProfileView
        profile={profile}
        own
        actions={
          <>
            <Link href="/me/edit" className={buttonClasses("primary")}>
              Edit profile
            </Link>
            {!profile.verified && (
              <Link href="/verification" className={buttonClasses("secondary")}>
                {profile.verificationStatus === "pending" ? "Verification in review" : "Get verified"}
              </Link>
            )}
          </>
        }
      />

      <Card className="flex flex-col gap-3">
        <h2 className="text-title-md">Your profiles</h2>
        <p className="text-body-sm text-ink-muted">
          One login can hold a Worker, an Intern and an Employer profile. Switch any time.
        </p>
        <ul className="flex flex-col gap-2">
          {ctx.profiles.map((p) => {
            const active = p.id === profile.id;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
                <span className="flex items-center gap-3">
                  <RoleBadge role={p.type} verified={p.verification_status === "verified"} size={40} />
                  <span>
                    <span className="block text-label">{roleLabel[p.type]}</span>
                    <span className="block text-body-sm text-ink-muted">{p.full_name}</span>
                  </span>
                </span>
                {active ? (
                  <span className="rounded-pill bg-primary-soft px-3 py-1.5 text-caption text-primary">Active</span>
                ) : (
                  <form action={switchProfileAction}>
                    <input type="hidden" name="profile_id" value={p.id} />
                    <button type="submit" className={buttonClasses("secondary")}>
                      Switch
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          {ctx.profiles.length < 3 && (
            <Link href="/onboarding" className={buttonClasses("ghost")}>
              Add another profile
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" className={buttonClasses("ghost")}>
              Sign out
            </button>
          </form>
        </div>
      </Card>
    </>
  );
}
