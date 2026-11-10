"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

const MAX_SKILLS = 15;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function requireProfile() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  return { supabase: ctx.supabase, userId: ctx.user.id, profile: ctx.activeProfile };
}

function text(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim().slice(0, max);
  return value || null;
}

function done() {
  revalidatePath("/me");
  revalidatePath("/me/edit");
  revalidatePath("/", "layout");
}

export interface BasicsState {
  error?: string;
  saved?: boolean;
}

export async function saveBasicsAction(_prev: BasicsState, formData: FormData): Promise<BasicsState> {
  const { supabase, profile } = await requireProfile();

  const fullName = text(formData, "full_name", 80);
  const countyId = Number(formData.get("county_id"));
  if (!fullName || fullName.length < 2) return { error: "Enter your name." };
  if (!Number.isInteger(countyId) || countyId < 1 || countyId > 47) return { error: "Choose your county." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      headline: text(formData, "headline", 120),
      bio: text(formData, "bio", 1000),
      county_id: countyId,
      town: text(formData, "town", 60),
    })
    .eq("id", profile.id);
  if (error) return { error: "We could not save your changes. Please try again." };

  if (profile.type === "employer") {
    const businessName = text(formData, "business_name", 100);
    if (!businessName || businessName.length < 2) return { error: "Enter the business name." };
    const { error: detailsError } = await supabase
      .from("employer_details")
      .upsert({ profile_id: profile.id, business_name: businessName, sector: text(formData, "sector", 60) });
    if (detailsError) return { error: "We could not save the business details. Please try again." };
  }

  done();
  return { saved: true };
}

export async function uploadPhotoAction(formData: FormData) {
  const { supabase, userId, profile } = await requireProfile();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > 1024 * 1024) return;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return;

  const path = `${userId}/${profile.id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
  if (error) return;

  await supabase.from("profiles").update({ photo_path: path }).eq("id", profile.id);
  if (profile.photo_path) await supabase.storage.from("avatars").remove([profile.photo_path]);
  done();
}

export async function saveSkillsAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const ids = [...new Set(formData.getAll("skill").map(Number))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, MAX_SKILLS);

  await supabase.from("profile_skills").delete().eq("profile_id", profile.id);
  if (ids.length > 0) {
    await supabase.from("profile_skills").insert(ids.map((skill_id) => ({ profile_id: profile.id, skill_id })));
  }
  done();
}

/** "2024-03" from a month picker -> "2024-03-01". */
function monthToDate(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "");
  return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : null;
}

export async function addExperienceAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const title = text(formData, "title", 100);
  if (!title || title.length < 2) return;
  const start = monthToDate(formData.get("start"));
  let end = monthToDate(formData.get("end"));
  if (start && end && end < start) end = null;

  await supabase.from("experiences").insert({
    profile_id: profile.id,
    title,
    organisation: text(formData, "organisation", 100),
    town: text(formData, "town", 60),
    start_date: start,
    end_date: end,
    description: text(formData, "description", 1000),
  });
  done();
}

export async function deleteExperienceAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  await supabase.from("experiences").delete().eq("id", String(formData.get("id"))).eq("profile_id", profile.id);
  done();
}

const kinds = ["secondary", "college", "university", "certificate", "trade_test"];

function year(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1960 && n <= 2100 ? n : null;
}

export async function addEducationAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const institution = text(formData, "institution", 120);
  const kind = String(formData.get("kind") ?? "");
  if (!institution || institution.length < 2 || !kinds.includes(kind)) return;

  await supabase.from("education").insert({
    profile_id: profile.id,
    kind,
    institution,
    qualification: text(formData, "qualification", 120),
    field: text(formData, "field", 120),
    start_year: year(formData.get("start_year")),
    end_year: year(formData.get("end_year")),
  });
  done();
}

export async function deleteEducationAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  await supabase.from("education").delete().eq("id", String(formData.get("id"))).eq("profile_id", profile.id);
  done();
}

export async function addPortfolioAction(formData: FormData) {
  const { supabase, userId, profile } = await requireProfile();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) return;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return;

  const path = `${userId}/${profile.id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
  if (error) return;

  await supabase
    .from("portfolio_items")
    .insert({ profile_id: profile.id, image_path: path, caption: text(formData, "caption", 140) });
  done();
}

export async function deletePortfolioAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = String(formData.get("id"));
  const { data } = await supabase
    .from("portfolio_items")
    .select("image_path")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!data) return;
  await supabase.from("portfolio_items").delete().eq("id", id);
  await supabase.storage.from("portfolio").remove([data.image_path]);
  done();
}
