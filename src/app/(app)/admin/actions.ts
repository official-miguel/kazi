"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only signed-in admins get the full-rights client. Everyone else gets null. */
async function adminOnly() {
  const ctx = await getSessionContext();
  if (!ctx?.account?.is_admin) return null;
  return createAdminClient();
}

/** Confirm a phone number without an SMS code. The person can then sign in with their PIN. */
export async function confirmPhoneAction(formData: FormData) {
  const admin = await adminOnly();
  const userId = String(formData.get("user_id") ?? "");
  if (!admin || !userId) return;
  await admin.auth.admin.updateUserById(userId, { phone_confirm: true });
  revalidatePath("/admin");
}

/** Remove an unconfirmed sign-up, for example a mistyped or fake number. */
export async function rejectSignUpAction(formData: FormData) {
  const admin = await adminOnly();
  const userId = String(formData.get("user_id") ?? "");
  if (!admin || !userId) return;

  // Safety: only ever delete accounts whose number is still unconfirmed.
  const { data } = await admin.auth.admin.getUserById(userId);
  if (!data.user || data.user.phone_confirmed_at) return;

  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
