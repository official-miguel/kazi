"use server";

import { redirect } from "next/navigation";
import { isAdminPhone } from "@/lib/admins";
import { normaliseKenyanPhone, phoneToLogin } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * How joining works
 *   1. A person joins with a phone number and a PIN. No SMS is involved.
 *   2. An admin confirms the number in the admin portal (after calling it).
 *   3. After that the person signs in with phone number + PIN.
 *
 * Behind the scenes the phone number is turned into a hidden login address
 * (see phoneToLogin), so nothing here depends on an SMS provider.
 * Confirming by SMS code can be added later, once a provider is connected.
 */

export interface SignInState {
  view: "signin" | "join" | "waiting";
  /** Full number, e.g. +254712345678. Kept so the waiting screen can show it. */
  phone: string;
  error?: string;
  notice?: string;
}

const MIN_PIN = 6;

export async function signInAction(prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = String(formData.get("intent") ?? "");

  // Moving between screens.
  if (intent === "show-join") return { view: "join", phone: "" };
  if (intent === "show-signin") return { view: "signin", phone: "" };

  const phone = normaliseKenyanPhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  const view = prev.view === "join" ? "join" : "signin";

  if (!phone) {
    return { view, phone: "", error: "Enter a Kenyan mobile number, like 0712 345 678." };
  }
  if (pin.length < MIN_PIN) {
    return { view, phone: "", error: `Your PIN needs at least ${MIN_PIN} characters.` };
  }

  const login = phoneToLogin(phone);

  if (view === "join") {
    const admin = createAdminClient();
    if (!admin) {
      return { view, phone: "", error: "Joining is not switched on yet. Please try again later. (Ref: no key)" };
    }

    // Admin numbers (see lib/admins.ts) are activated at once.
    // Everyone else stays locked until an admin confirms the number.
    const isAdmin = isAdminPhone(phone);

    const { data, error } = await admin.auth.admin.createUser({
      email: login,
      password: pin,
      email_confirm: isAdmin,
      user_metadata: { phone },
    });

    if (error || !data.user) {
      const m = (error?.message ?? "").toLowerCase();
      const status = error?.status ?? 0;
      if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
        return { view: "signin", phone: "", error: "This number already has an account. Sign in with your PIN." };
      }
      // Keep the full reason in the server log, and show a short reference so
      // the cause can be told apart from a screenshot.
      console.error("[join] createUser failed", { status, code: error?.code, message: error?.message });
      if (status === 401 || status === 403 || m.includes("not allowed") || m.includes("api key") || m.includes("jwt")) {
        return { view, phone: "", error: "Joining is not set up correctly yet. Please try again later. (Ref: key)" };
      }
      if (m.includes("database")) {
        return { view, phone: "", error: "We could not save your account. Please try again later. (Ref: database)" };
      }
      if (m.includes("password") || m.includes("weak")) {
        return { view, phone: "", error: "That PIN is too easy to guess. Choose a longer one. (Ref: pin)" };
      }
      if (m.includes("email") || m.includes("invalid")) {
        return { view, phone: "", error: "We could not create your account. Please try again later. (Ref: address)" };
      }
      return {
        view,
        phone: "",
        error: `We could not create your account. Please try again. (Ref: ${error?.code ?? status ?? "unknown"})`,
      };
    }

    // Save the phone number on the account, so employers can call shortlisted
    // applicants and admins can find people by number. Stored without the "+".
    const { error: accountError } = await admin
      .from("accounts")
      .update({ phone: phone.replace(/\D/g, ""), ...(isAdmin ? { is_admin: true } : {}) })
      .eq("id", data.user.id);
    if (accountError) {
      console.error("[join] account update failed", { code: accountError.code, message: accountError.message });
    }

    if (isAdmin) {
      // Sign the new admin in straight away and send them to set up a profile.
      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: login, password: pin });
      if (signInError) {
        return { view: "signin", phone: "", notice: "Your account is ready. Sign in with your number and PIN." };
      }
      redirect("/admin");
    }

    return { view: "waiting", phone, notice: "Your account is created." };
  }

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({ email: login, password: pin });

  // An admin number that joined before auto-activation existed is still
  // "waiting". Supabase only reports "not confirmed" when the PIN was correct,
  // so it is safe to activate the account here and sign in again.
  if (error && error.message.toLowerCase().includes("not confirmed") && isAdminPhone(phone)) {
    const admin = createAdminClient();
    const { data: account } = admin
      ? await admin.from("accounts").select("id").eq("email", login).maybeSingle()
      : { data: null };
    if (admin && account) {
      await admin.auth.admin.updateUserById(account.id, { email_confirm: true });
      await admin.from("accounts").update({ phone: phone.replace(/\D/g, ""), is_admin: true }).eq("id", account.id);
      ({ data, error } = await supabase.auth.signInWithPassword({ email: login, password: pin }));
    }
  }

  if (error || !data.user) {
    const m = (error?.message ?? "").toLowerCase();
    if (m.includes("not confirmed")) {
      return { view: "waiting", phone };
    }
    if (m.includes("invalid login") || m.includes("credentials")) {
      return { view, phone: "", error: "That number or PIN is not right. Check both and try again." };
    }
    console.error("[sign-in] failed", { status: error?.status, code: error?.code, message: error?.message });
    return {
      view,
      phone: "",
      error: `We could not sign you in. Please try again. (Ref: ${error?.code ?? error?.status ?? "unknown"})`,
    };
  }

  // Admins go straight to the admin portal.
  const { data: account } = await supabase.from("accounts").select("is_admin").eq("id", data.user.id).maybeSingle();
  if (account?.is_admin) redirect("/admin");

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_id", data.user.id);
  redirect(count && count > 0 ? "/home" : "/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
