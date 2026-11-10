import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { buttonClasses } from "@/components/ui/Button";
import { getSessionContext } from "@/lib/auth";
import { getFullProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Profile" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ application?: string; post?: string }>;
}

/** Someone else's profile. Employers reach it from their applicant list. */
export default async function PersonPage({ params, searchParams }: Props) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;
  const { application, post } = await searchParams;

  const profile = await getFullProfile(ctx.supabase, id);
  if (!profile) notFound();

  // Opening an applicant's profile marks their application as "Seen".
  // The database checks that the viewer really owns the post.
  if (application) {
    await ctx.supabase.rpc("set_application_status", { _application_id: application, _new_status: "seen" });
  }

  return (
    <ProfileView
      profile={profile}
      actions={
        post ? (
          <Link href={`/posts/${post}`} className={buttonClasses("secondary")}>
            Back to applicants
          </Link>
        ) : undefined
      }
    />
  );
}
