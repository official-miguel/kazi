"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { formatKenyanPhone, loginToPhone, normaliseKenyanPhone, phoneToLogin } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only signed-in admins get the full-rights client. Everyone else gets null. */
async function adminOnly() {
  const ctx = await getSessionContext();
  if (!ctx?.account?.is_admin) return null;
  const admin = createAdminClient();
  return admin ? { admin, myId: ctx.account.id } : null;
}

/** Confirm a phone number without an SMS code. The person can then sign in with their PIN. */
export async function confirmPhoneAction(formData: FormData) {
  const session = await adminOnly();
  const userId = String(formData.get("user_id") ?? "");
  if (!session || !userId) return;
  await session.admin.auth.admin.updateUserById(userId, { email_confirm: true });
  revalidatePath("/admin");
}

/** Remove an unconfirmed sign-up, for example a mistyped or fake number. */
export async function rejectSignUpAction(formData: FormData) {
  const session = await adminOnly();
  const userId = String(formData.get("user_id") ?? "");
  if (!session || !userId) return;

  // Safety: only ever delete phone sign-ups that are still unconfirmed.
  const { data } = await session.admin.auth.admin.getUserById(userId);
  if (!data.user || data.user.email_confirmed_at || !loginToPhone(data.user.email)) return;

  await session.admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}

export interface AddAdminState {
  error?: string;
  notice?: string;
}

const MIN_PIN = 6;

/**
 * Make a phone number an admin.
 *  - If the number already has an account, it is confirmed and made an admin.
 *  - If not, an account is created with the starting PIN given here.
 */
export async function addAdminAction(_prev: AddAdminState, formData: FormData): Promise<AddAdminState> {
  const session = await adminOnly();
  if (!session) return { error: "Only admins can do this." };
  const { admin } = session;

  const phone = normaliseKenyanPhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  if (!phone) return { error: "Enter a Kenyan mobile number, like 0712 345 678." };

  const login = phoneToLogin(phone);
  const digits = phone.replace(/\D/g, "");
  const shown = formatKenyanPhone(phone);

  const { data: existing } = await admin.from("accounts").select("id, is_admin").eq("email", login).maybeSingle();

  if (existing) {
    if (existing.is_admin) return { notice: `${shown} is already an admin.` };
    await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
    const { error } = await admin.from("accounts").update({ is_admin: true, phone: digits }).eq("id", existing.id);
    if (error) return { error: "We could not make this number an admin. Please try again." };
    revalidatePath("/admin");
    return { notice: `${shown} is now an admin. They sign in with their own PIN.` };
  }

  if (pin.length < MIN_PIN) {
    return {
      error: `${shown} has no account yet. Enter a starting PIN of at least ${MIN_PIN} characters to create one.`,
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: login,
    password: pin,
    email_confirm: true,
    user_metadata: { phone },
  });
  if (error || !data.user) {
    console.error("[admin] add admin failed", { status: error?.status, code: error?.code, message: error?.message });
    return { error: "We could not create this account. Please try again." };
  }
  await admin.from("accounts").update({ is_admin: true, phone: digits }).eq("id", data.user.id);

  revalidatePath("/admin");
  return { notice: `${shown} is now an admin. Give them the starting PIN in person or by phone call.` };
}

/** Take admin rights away from someone else. Their account stays. */
export async function removeAdminAction(formData: FormData) {
  const session = await adminOnly();
  const accountId = String(formData.get("account_id") ?? "");
  // You cannot remove yourself, so there is always at least one admin.
  if (!session || !accountId || accountId === session.myId) return;
  await session.admin.from("accounts").update({ is_admin: false }).eq("id", accountId);
  revalidatePath("/admin");
}

/* ---------- Verification requests ---------- */

/** Approve or reject a verification request. The database double-checks the admin. */
export async function reviewVerificationAction(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx?.account?.is_admin) return;
  const id = String(formData.get("verification_id") ?? "");
  const approve = formData.get("decision") === "approve";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!id) return;

  // Runs as the signed-in admin, so the review is recorded under their name.
  await ctx.supabase.rpc("review_verification", {
    _verification_id: id,
    _approve: approve,
    _note: note || null,
  });
  revalidatePath("/admin");
}

/* ---------- Reported posts ---------- */

/** Close a reported post and mark its reports as handled. */
export async function closeReportedPostAction(formData: FormData) {
  const session = await adminOnly();
  const jobId = String(formData.get("job_id") ?? "");
  if (!session || !jobId) return;
  await session.admin.from("jobs").update({ status: "closed" }).eq("id", jobId);
  await session.admin.from("job_reports").update({ resolved_at: new Date().toISOString() }).eq("job_id", jobId).is("resolved_at", null);
  revalidatePath("/admin");
}

/** The post is fine: mark its reports as handled and leave it up. */
export async function dismissReportsAction(formData: FormData) {
  const session = await adminOnly();
  const jobId = String(formData.get("job_id") ?? "");
  if (!session || !jobId) return;
  await session.admin.from("job_reports").update({ resolved_at: new Date().toISOString() }).eq("job_id", jobId).is("resolved_at", null);
  revalidatePath("/admin");
}

/* ---------- Demo data ---------- */

const DEMO_DOMAIN = "demo.kazilink.invalid";

interface DemoPost {
  title: string;
  type: "job" | "internship" | "attachment";
  category: string;
  payMin: number;
  payMax: number;
  period: "day" | "week" | "month";
  days: number;
  description: string;
  requirements: string;
}

const demoEmployers: Array<{
  contact: string;
  business: string;
  sector: string;
  countyId: number;
  town: string;
  bio: string;
  posts: DemoPost[];
}> = [
  {
    contact: "Peter Kariuki",
    business: "Mwangaza Electricals",
    sector: "Electrical and solar installation",
    countyId: 32,
    town: "Nakuru Town",
    bio: "We wire homes and shops and install solar across Nakuru County.",
    posts: [
      { title: "Electrician, wiring and solar", type: "job", category: "electrical", payMin: 35000, payMax: 45000, period: "month", days: 18, description: "House wiring, fault finding and solar installations for homes and small businesses.", requirements: "Grade II or III trade test. Own basic tools. Two years of experience." },
      { title: "Electrical attachment, 3 months", type: "attachment", category: "electrical", payMin: 6000, payMax: 6000, period: "month", days: 25, description: "Work alongside our technicians on real installations.", requirements: "Studying electrical engineering at a TVET or college. Letter from your institution." },
    ],
  },
  {
    contact: "Amina Yusuf",
    business: "Pwani Freight Services",
    sector: "Clearing, forwarding and transport",
    countyId: 1,
    town: "Nyali",
    bio: "Clearing and forwarding agents at the Port of Mombasa.",
    posts: [
      { title: "ICT support attachment, 3 months", type: "attachment", category: "ict", payMin: 8000, payMax: 8000, period: "month", days: 21, description: "Help staff with computers, printers and the office network.", requirements: "Diploma or degree student in ICT. Good with people." },
      { title: "Light truck driver", type: "job", category: "transport", payMin: 30000, payMax: 38000, period: "month", days: 14, description: "Deliveries between the port, Changamwe and Mariakani.", requirements: "BCE licence, PSV not needed. Three years of driving. Clean record." },
    ],
  },
  {
    contact: "Grace Atieno",
    business: "Baraka Fashions",
    sector: "Tailoring and school uniforms",
    countyId: 42,
    town: "Kisumu Central",
    bio: "School uniforms and custom wear, sewn in Kisumu.",
    posts: [
      { title: "Tailor for school uniforms", type: "job", category: "tailoring", payMin: 1200, payMax: 1500, period: "day", days: 10, description: "Busy season work sewing shirts, shorts and dresses for January school opening.", requirements: "Fast and neat on an industrial machine. Uniform experience is a plus." },
    ],
  },
  {
    contact: "Daniel Kiprop",
    business: "Highland Dairy Co-operative",
    sector: "Dairy farming and processing",
    countyId: 27,
    town: "Eldoret",
    bio: "A farmers' co-operative collecting and processing milk in Uasin Gishu.",
    posts: [
      { title: "Accounts intern", type: "internship", category: "accounting", payMin: 15000, payMax: 15000, period: "month", days: 30, description: "Help with farmer payments, receipts and monthly reports.", requirements: "CPA Part I or a finance diploma. Good with Excel." },
      { title: "Milk collection rider", type: "job", category: "transport", payMin: 22000, payMax: 26000, period: "month", days: 12, description: "Morning collection rounds from farms to the cooling plant.", requirements: "Motorcycle licence and your own protective gear. Knows the Moiben and Ziwa routes." },
    ],
  },
  {
    contact: "Mercy Wanjiku",
    business: "Jikoni Fresh Caterers",
    sector: "Catering and events",
    countyId: 47,
    town: "Kasarani",
    bio: "Outside catering for weddings, offices and schools in Nairobi.",
    posts: [
      { title: "Cook for outside catering", type: "job", category: "hospitality", payMin: 1500, payMax: 2000, period: "day", days: 9, description: "Cook Kenyan dishes in bulk for weekend events.", requirements: "Food handler's certificate. Experience cooking for 100 or more people." },
      { title: "Food and beverage attachment", type: "attachment", category: "hospitality", payMin: 5000, payMax: 5000, period: "month", days: 28, description: "Kitchen and service rotation over three months.", requirements: "Hospitality student. Letter from your college." },
    ],
  },
  {
    contact: "John Mutua",
    business: "Mutua Motors Garage",
    sector: "Vehicle repair",
    countyId: 16,
    town: "Machakos Town",
    bio: "General garage for saloon cars, matatus and pick-ups.",
    posts: [
      { title: "Motor vehicle mechanic", type: "job", category: "mechanics", payMin: 28000, payMax: 35000, period: "month", days: 16, description: "Service and repair of petrol and diesel engines, brakes and suspension.", requirements: "Grade II trade test. Able to diagnose without supervision." },
    ],
  },
];

/** Create six verified demo employers with eleven live posts, so the app has something to browse. */
export async function loadDemoDataAction() {
  const session = await adminOnly();
  if (!session) return;
  const { admin } = session;

  const { count } = await admin.from("accounts").select("id", { count: "exact", head: true }).like("email", `%@${DEMO_DOMAIN}`);
  if (count && count > 0) return; // already loaded

  const { data: cats } = await admin.from("categories").select("id, slug");
  const categoryId = new Map(((cats ?? []) as Array<{ id: number; slug: string }>).map((c) => [c.slug, c.id]));
  const dayMs = 24 * 60 * 60 * 1000;

  for (const [i, e] of demoEmployers.entries()) {
    const { data: created } = await admin.auth.admin.createUser({
      email: `employer-${i + 1}@${DEMO_DOMAIN}`,
      password: crypto.randomUUID(), // nobody signs in to demo accounts
      email_confirm: true,
      user_metadata: { demo: true },
    });
    if (!created.user) continue;

    const { data: profile } = await admin
      .from("profiles")
      .insert({
        account_id: created.user.id,
        type: "employer",
        full_name: e.contact,
        headline: e.sector,
        bio: e.bio,
        county_id: e.countyId,
        town: e.town,
        verification_status: "verified",
      })
      .select("id")
      .single();
    if (!profile) continue;

    await admin.from("employer_details").insert({ profile_id: profile.id, business_name: e.business, sector: e.sector });
    await admin.from("jobs").insert(
      e.posts.map((p) => ({
        employer_profile_id: profile.id,
        title: p.title,
        type: p.type,
        category_id: categoryId.get(p.category) ?? null,
        county_id: e.countyId,
        town: e.town,
        pay_min: p.payMin,
        pay_max: p.payMax,
        pay_period: p.period,
        description: p.description,
        requirements: p.requirements,
        deadline: new Date(Date.now() + p.days * dayMs).toISOString().slice(0, 10),
        status: "live",
      })),
    );
  }

  revalidatePath("/", "layout");
}

/** Delete the demo employers, their posts, and any applications sent to those posts. */
export async function removeDemoDataAction() {
  const session = await adminOnly();
  if (!session) return;
  const { admin } = session;

  const { data } = await admin.from("accounts").select("id").like("email", `%@${DEMO_DOMAIN}`);
  for (const row of (data ?? []) as Array<{ id: string }>) {
    await admin.auth.admin.deleteUser(row.id);
  }
  revalidatePath("/", "layout");
}
