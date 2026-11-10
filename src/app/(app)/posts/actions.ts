"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { today } from "@/lib/data";

async function requireEmployer() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  if (ctx.activeProfile.type !== "employer") redirect("/home");
  return { supabase: ctx.supabase, profile: ctx.activeProfile };
}

export interface PostState {
  error?: string;
}

const types = ["job", "internship", "attachment"];
const periods = ["day", "week", "month"];

export async function createPostAction(_prev: PostState, formData: FormData): Promise<PostState> {
  const { supabase, profile } = await requireEmployer();

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const countyId = Number(formData.get("county_id"));
  const categoryId = Number(formData.get("category_id")) || null;
  const town = String(formData.get("town") ?? "").trim().slice(0, 60);
  const deadline = String(formData.get("deadline") ?? "");
  const period = String(formData.get("pay_period") ?? "month");
  const payMinRaw = String(formData.get("pay_min") ?? "").replace(/[^\d]/g, "");
  const payMaxRaw = String(formData.get("pay_max") ?? "").replace(/[^\d]/g, "");
  const payMin = payMinRaw ? Number(payMinRaw) : null;
  let payMax = payMaxRaw ? Number(payMaxRaw) : null;
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  const requirements = String(formData.get("requirements") ?? "").trim().slice(0, 2000);

  if (title.length < 3 || title.length > 100) return { error: "Give the post a title, like “Electrician” or “Accounts intern”." };
  if (!types.includes(type)) return { error: "Choose the type of post." };
  if (!Number.isInteger(countyId) || countyId < 1 || countyId > 47) return { error: "Choose the county." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline < today()) return { error: "Choose a closing date that is today or later." };
  if (!periods.includes(period)) return { error: "Choose how often the pay is paid." };
  if (payMin !== null && payMax !== null && payMax < payMin) payMax = payMin;

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      employer_profile_id: profile.id,
      title,
      type,
      category_id: categoryId,
      county_id: countyId,
      town: town || null,
      pay_min: payMin,
      pay_max: payMax ?? payMin,
      pay_period: period,
      description: description || null,
      requirements: requirements || null,
      deadline,
      // The database holds this as "waiting" until the employer is verified.
      status: "live",
    })
    .select("id")
    .single();

  if (error || !data) return { error: "We could not save the post. Check your connection and try again." };

  revalidatePath("/posts");
  revalidatePath("/home");
  redirect(`/posts/${data.id}`);
}

/** Close a post, or open it again. */
export async function setPostStatusAction(formData: FormData) {
  const { supabase, profile } = await requireEmployer();
  const id = String(formData.get("job_id") ?? "");
  const status = formData.get("status") === "closed" ? "closed" : "live";
  await supabase.from("jobs").update({ status }).eq("id", id).eq("employer_profile_id", profile.id);
  revalidatePath(`/posts/${id}`);
  revalidatePath("/posts");
  revalidatePath("/home");
}

const moves = ["shortlisted", "accepted", "not_selected"];

/** Shortlist, accept or decline an applicant. The database checks ownership and the order of steps. */
export async function setApplicationStatusAction(formData: FormData) {
  const { supabase } = await requireEmployer();
  const applicationId = String(formData.get("application_id") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!applicationId || !moves.includes(status)) return;

  await supabase.rpc("set_application_status", { _application_id: applicationId, _new_status: status });
  revalidatePath(`/posts/${jobId}`);
  revalidatePath("/home");
}
