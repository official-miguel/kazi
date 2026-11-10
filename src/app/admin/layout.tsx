import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { signOutAction } from "../sign-in/actions";

/** The admin portal. Admins do not need a worker, intern or employer profile to use it. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  // People who are not admins should not even learn this area exists.
  if (!ctx.account?.is_admin) notFound();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between gap-4 px-4">
          <Link href="/admin" className="flex items-baseline gap-2 text-title-md text-primary">
            {brand.name}
            <span className="rounded-pill bg-amber-soft px-2.5 py-1 text-caption text-amber-ink">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={ctx.profiles.length > 0 ? "/home" : "/onboarding"} className="hidden text-label text-primary sm:block">
              {ctx.profiles.length > 0 ? "Go to the app" : "Set up a member profile"}
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" className="px-4">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-8 px-4 py-6">{children}</main>
    </>
  );
}
