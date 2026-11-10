"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

/** Change which profile (Worker, Intern or Employer) the person is using. */
export async function switchProfileAction(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!ctx.profiles.some((p) => p.id === profileId)) return;

  await ctx.supabase.from("accounts").update({ active_profile_id: profileId }).eq("id", ctx.user.id);
  revalidatePath("/", "layout");
  redirect("/home");
}

/** One-tap apply. The active profile is what gets sent. */
export async function applyAction(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const jobId = String(formData.get("job_id") ?? "");
  const profile = ctx.activeProfile;
  if (!jobId || !profile || profile.type === "employer") return;

  await ctx.supabase.from("applications").insert({ job_id: jobId, seeker_profile_id: profile.id });

  revalidatePath("/home");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/applications");
}

const reportReasons = ["asks_for_money", "fake_job", "wrong_details", "offensive", "other"];

/** Report a post to the admins. */
export async function reportJobAction(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  const jobId = String(formData.get("job_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!jobId || !reportReasons.includes(reason)) return;

  // A second report from the same person is ignored by the database.
  await ctx.supabase.from("job_reports").insert({ job_id: jobId, reason, details: details || null });
  redirect(`/jobs/${jobId}?reported=1`);
}
