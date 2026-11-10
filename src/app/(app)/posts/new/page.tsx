import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { getCategories, getCounties, today } from "@/lib/data";
import { PostForm } from "./PostForm";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewPostPage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  if (ctx.activeProfile.type !== "employer") redirect("/home");
  const profile = ctx.activeProfile;

  const [counties, categories] = await Promise.all([getCounties(ctx.supabase), getCategories(ctx.supabase)]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg">Post a job or attachment</h1>
        <p className="text-ink-muted">This takes about a minute.</p>
      </header>

      {profile.verification_status !== "verified" && (
        <p className="rounded-lg bg-amber-soft px-4 py-3 text-body-sm">
          <span className="text-label">You can post now.</span> The post goes public once your business is verified.
        </p>
      )}

      <Card>
        <PostForm
          counties={counties}
          categories={categories}
          defaultCountyId={profile.county_id}
          defaultTown={profile.town}
          minDate={today()}
        />
      </Card>
    </>
  );
}
