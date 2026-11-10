"use server";

import { redirect } from "next/navigation";
import { normaliseKenyanPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  step: "phone" | "code";
  /** Full number, e.g. +254712345678. Empty until a code has been sent. */
  phone: string;
  error?: string;
  notice?: string;
}

/** Turn a Supabase error into plain words. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("provider") || m.includes("unsupported phone")) {
    return "Phone sign-in is not switched on yet. Please try again later.";
  }
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) {
    return "Too many tries. Wait a minute, then try again.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) {
    return "That code is not right or has expired. Check it, or ask for a new one.";
  }
  return "Something went wrong. Check your connection and try again.";
}

export async function signInAction(prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = String(formData.get("intent") ?? "");
  const supabase = await createClient();

  if (intent === "change") {
    return { step: "phone", phone: "" };
  }

  if (prev.step === "phone" || intent === "resend") {
    const phone = intent === "resend" ? prev.phone : normaliseKenyanPhone(String(formData.get("phone") ?? ""));
    if (!phone) {
      return { step: "phone", phone: "", error: "Enter a Kenyan mobile number, like 0712 345 678." };
    }
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      return { step: prev.step, phone: prev.phone, error: friendly(error.message) };
    }
    return { step: "code", phone, notice: intent === "resend" ? "We sent a new code." : undefined };
  }

  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) {
    return { step: "code", phone: prev.phone, error: "Enter all 6 digits of the code." };
  }

  const { data, error } = await supabase.auth.verifyOtp({ phone: prev.phone, token, type: "sms" });
  if (error || !data.user) {
    return { step: "code", phone: prev.phone, error: friendly(error?.message ?? "invalid") };
  }

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
