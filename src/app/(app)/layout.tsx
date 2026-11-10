import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { signOutAction } from "../sign-in/actions";

/**
 * Everything inside (app) needs a signed-in person with at least one profile.
 * The full navigation and the account switcher arrive in the next build step.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeProfile) redirect("/onboarding");

  const profile = ctx.activeProfile;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between gap-4 px-4">
          <Link href="/home" className="text-title-md text-primary">
            {brand.name}
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <RoleBadge role={profile.type} verified={profile.verification_status === "verified"} size={32} />
            <span className="hidden truncate text-label sm:block">{profile.full_name}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" className="px-4">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </>
  );
}
