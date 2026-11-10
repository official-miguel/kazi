"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface OnboardingState {
  error?: string;
  fieldErrors?: Partial<Record<"role" | "full_name" | "county_id" | "business_name", string>>;
}

const roles: Role[] = ["worker", "intern", "employer"];

export async function createProfileAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const role = String(formData.get("role") ?? "") as Role;
  const fullName = String(formData.get("full_name") ?? "").trim();
  const countyId = Number(formData.get("county_id"));
  const town = String(formData.get("town") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim();

  const fieldErrors: OnboardingState["fieldErrors"] = {};
  if (!roles.includes(role)) fieldErrors.role = "Choose how you want to use the app.";
  if (fullName.length < 2) fieldErrors.full_name = "Enter your name.";
  if (!Number.isInteger(countyId) || countyId < 1 || countyId > 47) fieldErrors.county_id = "Choose your county.";
  if (role === "employer" && businessName.length < 2) fieldErrors.business_name = "Enter the business name.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ account_id: user.id, type: role, full_name: fullName, county_id: countyId, town: town || null })
    .select("id")
    .single();

  if (error || !profile) {
    if (error?.code === "23505") return { error: "You already have this kind of profile. Switch to it from the menu." };
    return { error: "We could not save your profile. Check your connection and try again." };
  }

  if (role === "employer") {
    const { error: detailsError } = await supabase
      .from("employer_details")
      .insert({ profile_id: profile.id, business_name: businessName, sector: sector || null });
    if (detailsError) {
      // Do not leave a half-made employer profile behind.
      await supabase.from("profiles").delete().eq("id", profile.id);
      return { error: "We could not save your business details. Please try again." };
    }
  }

  await supabase.from("accounts").update({ active_profile_id: profile.id }).eq("id", user.id);

  redirect("/home");
}
