import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";
import type { ApplicationStatus, JobSummary, JobType, PayPeriod, Role } from "@/lib/types";

/* Shared database reads. Every function takes the caller's Supabase client,
   so row-level security decides what comes back. */

export interface JobListing extends JobSummary {
  status: "draft" | "waiting" | "live" | "closed";
  categoryId: number | null;
  categoryName: string | null;
  countyId: number;
  description: string | null;
  requirements: string | null;
  employerProfileId: string;
  createdAt: string;
}

interface JobListingRow {
  id: string;
  title: string;
  type: JobType;
  status: JobListing["status"];
  category_id: number | null;
  category_name: string | null;
  county_id: number;
  county_name: string;
  town: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: PayPeriod;
  description: string | null;
  requirements: string | null;
  deadline: string;
  created_at: string;
  employer_profile_id: string;
  employer_name: string;
  employer_verified: boolean;
}

function toListing(r: JobListingRow): JobListing {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    categoryId: r.category_id,
    categoryName: r.category_name,
    countyId: r.county_id,
    county: r.county_name,
    town: r.town ?? "",
    payMin: r.pay_min ?? undefined,
    payMax: r.pay_max ?? undefined,
    payPeriod: r.pay_period,
    description: r.description,
    requirements: r.requirements,
    deadline: r.deadline,
    createdAt: r.created_at,
    employerProfileId: r.employer_profile_id,
    employerName: r.employer_name,
    employerVerified: r.employer_verified,
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface JobFilters {
  q?: string;
  type?: JobType;
  countyId?: number;
  categoryId?: number;
  limit?: number;
}

/** Open posts, newest first. */
export async function listOpenJobs(supabase: SupabaseClient, filters: JobFilters = {}): Promise<JobListing[]> {
  let query = supabase
    .from("job_listings")
    .select("*")
    .eq("status", "live")
    .gte("deadline", today())
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 30);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.countyId) query = query.eq("county_id", filters.countyId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.q) {
    // Keep only letters, numbers and spaces so the search text cannot break the filter.
    const safe = filters.q.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,employer_name.ilike.%${safe}%,town.ilike.%${safe}%`);
  }

  const { data } = await query;
  return ((data ?? []) as JobListingRow[]).map(toListing);
}

export async function getJob(supabase: SupabaseClient, id: string): Promise<JobListing | null> {
  const { data } = await supabase.from("job_listings").select("*").eq("id", id).maybeSingle();
  return data ? toListing(data as JobListingRow) : null;
}

export async function getJobsByIds(supabase: SupabaseClient, ids: string[]): Promise<Map<string, JobListing>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("job_listings").select("*").in("id", ids);
  return new Map(((data ?? []) as JobListingRow[]).map((r) => [r.id, toListing(r)]));
}

/** job id -> status, for everything this profile has applied to. */
export async function getAppliedMap(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Map<string, ApplicationStatus>> {
  const { data } = await supabase.from("applications").select("job_id, status").eq("seeker_profile_id", profileId);
  return new Map(((data ?? []) as Array<{ job_id: string; status: ApplicationStatus }>).map((a) => [a.job_id, a.status]));
}

export interface Option {
  id: number;
  name: string;
}

export async function getCounties(supabase: SupabaseClient): Promise<Option[]> {
  const { data } = await supabase.from("counties").select("id, name").order("name");
  return (data ?? []) as Option[];
}

export async function getCategories(supabase: SupabaseClient): Promise<Option[]> {
  const { data } = await supabase.from("categories").select("id, name").order("name");
  return (data ?? []) as Option[];
}

export interface FullProfile {
  id: string;
  accountId: string;
  type: Role;
  fullName: string;
  headline: string | null;
  bio: string | null;
  countyId: number | null;
  countyName: string | null;
  town: string | null;
  photoUrl: string | null;
  verified: boolean;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  businessName: string | null;
  sector: string | null;
  skills: Array<{ id: number; name: string }>;
  experiences: Array<{
    id: string;
    title: string;
    organisation: string | null;
    town: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
  }>;
  education: Array<{
    id: string;
    kind: string;
    institution: string;
    qualification: string | null;
    field: string | null;
    start_year: number | null;
    end_year: number | null;
  }>;
  portfolio: Array<{ id: string; url: string; path: string; caption: string | null }>;
}

export function publicFileUrl(bucket: "avatars" | "portfolio", path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/** Everything needed to show a profile as a CV. */
export async function getFullProfile(supabase: SupabaseClient, id: string): Promise<FullProfile | null> {
  const { data: p } = await supabase
    .from("profiles")
    .select("id, account_id, type, full_name, headline, bio, county_id, town, photo_path, verification_status")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const [county, details, skills, experiences, education, portfolio] = await Promise.all([
    p.county_id
      ? supabase.from("counties").select("name").eq("id", p.county_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("employer_details").select("business_name, sector").eq("profile_id", id).maybeSingle(),
    supabase.from("profile_skills").select("skill_id, skills(id, name)").eq("profile_id", id),
    supabase
      .from("experiences")
      .select("id, title, organisation, town, start_date, end_date, description")
      .eq("profile_id", id)
      .order("start_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("education")
      .select("id, kind, institution, qualification, field, start_year, end_year")
      .eq("profile_id", id)
      .order("end_year", { ascending: false, nullsFirst: true }),
    supabase.from("portfolio_items").select("id, image_path, caption").eq("profile_id", id).order("created_at"),
  ]);

  const skillRows = (skills.data ?? []) as unknown as Array<{ skills: { id: number; name: string } | null }>;

  return {
    id: p.id,
    accountId: p.account_id,
    type: p.type,
    fullName: p.full_name,
    headline: p.headline,
    bio: p.bio,
    countyId: p.county_id,
    countyName: (county.data as { name: string } | null)?.name ?? null,
    town: p.town,
    photoUrl: p.photo_path ? publicFileUrl("avatars", p.photo_path) : null,
    verified: p.verification_status === "verified",
    verificationStatus: p.verification_status,
    businessName: details.data?.business_name ?? null,
    sector: details.data?.sector ?? null,
    skills: skillRows.flatMap((s) => (s.skills ? [s.skills] : [])).sort((a, b) => a.name.localeCompare(b.name)),
    experiences: (experiences.data ?? []) as FullProfile["experiences"],
    education: (education.data ?? []) as FullProfile["education"],
    portfolio: ((portfolio.data ?? []) as Array<{ id: string; image_path: string; caption: string | null }>).map(
      (i) => ({ id: i.id, path: i.image_path, url: publicFileUrl("portfolio", i.image_path), caption: i.caption }),
    ),
  };
}
