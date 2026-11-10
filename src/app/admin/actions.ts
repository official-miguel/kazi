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
