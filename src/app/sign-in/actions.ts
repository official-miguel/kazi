"use server";

import { redirect } from "next/navigation";
import { normaliseKenyanPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * How joining works
 *   1. A person joins with a phone number and a PIN. No SMS is needed.
 *   2. Their number must then be confirmed, in one of two ways:
 *        - they ask for an SMS code and enter it, or
 *        - an admin confirms the number in the admin portal.
 *   3. After that they sign in with phone number + PIN.
 */

export interface SignInState {
  view: "signin" | "join" | "confirm" | "code";
  /** Full number, e.g. +254712345678. Kept between steps. */
  phone: string;
  error?: string;
  notice?: string;
}

const MIN_PIN = 6;

function smsProblem(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) {
    return "Too many tries. Wait a minute, then try again.";
  }
  return "We could not send an SMS right now. You can wait for our team to confirm your number instead.";
}

async function goToApp(userId: string): Promise<never> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_id", userId);
  redirect(count && count > 0 ? "/home" : "/onboarding");
}

export async function signInAction(prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = String(formData.get("intent") ?? "");
  const supabase = await createClient();

  // Moving between screens.
  if (intent === "show-join") return { view: "join", phone: "" };
  if (intent === "show-signin") return { view: "signin", phone: "" };

  // Ask for an SMS code to confirm the number.
  if (intent === "send-code") {
    const { error } = await supabase.auth.signInWithOtp({
      phone: prev.phone,
      options: { shouldCreateUser: false },
    });
    if (error) return { view: "confirm", phone: prev.phone, error: smsProblem(error.message) };
    return { view: "code", phone: prev.phone };
  }

  // Enter the SMS code.
  if (prev.view === "code") {
    const token = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (token.length !== 6) {
      return { view: "code", phone: prev.phone, error: "Enter all 6 digits of the code." };
    }
    const { data, error } = await supabase.auth.verifyOtp({ phone: prev.phone, token, type: "sms" });
    if (error || !data.user) {
      return {
        view: "code",
        phone: prev.phone,
        error: "That code is not right or has expired. Check it, or ask for a new one.",
      };
    }
    return goToApp(data.user.id);
  }

  // Sign in and Join both start from a phone number and a PIN.
  const phone = normaliseKenyanPhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  const view = prev.view === "join" ? "join" : "signin";

  if (!phone) {
    return { view, phone: "", error: "Enter a Kenyan mobile number, like 0712 345 678." };
  }
  if (pin.length < MIN_PIN) {
    return { view, phone: "", error: `Your PIN needs at least ${MIN_PIN} characters.` };
  }

  if (view === "join") {
    const admin = createAdminClient();
    if (!admin) {
      return { view, phone: "", error: "Joining is not switched on yet. Please try again later." };
    }
    const { error } = await admin.auth.admin.createUser({ phone, password: pin, phone_confirm: false });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
        return { view: "signin", phone: "", error: "This number already has an account. Sign in with your PIN." };
      }
      return { view, phone: "", error: "We could not create your account. Check your connection and try again." };
    }
    return { view: "confirm", phone, notice: "Your account is created." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ phone, password: pin });
  if (error || !data.user) {
    const m = (error?.message ?? "").toLowerCase();
    if (m.includes("not confirmed")) {
      return { view: "confirm", phone };
    }
    if (m.includes("disabled") || m.includes("provider")) {
      return { view, phone: "", error: "Phone sign-in is not switched on yet. Please try again later." };
    }
    return { view, phone: "", error: "That number or PIN is not right. Check both and try again." };
  }
  return goToApp(data.user.id);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
