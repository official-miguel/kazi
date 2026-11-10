/**
 * Turn what a person types into a full Kenyan number: +2547XXXXXXXX or +2541XXXXXXXX.
 * Accepts 0712 345 678, 712345678, 254712345678 and +254 712 345 678.
 * Returns null when it is not a Kenyan mobile number.
 */
export function normaliseKenyanPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[71]\d{8}$/.test(digits)) return null;
  return `+254${digits}`;
}

/*
 * Sign-in runs on Supabase's email + password login, so it does not depend on
 * an SMS provider. Each phone number gets a hidden login address that people
 * never see. The ".invalid" ending is reserved: it can never be registered or
 * receive mail, so nobody can intercept anything sent to it.
 */
const LOGIN_DOMAIN = "phone.kazilink.invalid";

/** +254712345678 -> 254712345678@phone.kazilink.invalid */
export function phoneToLogin(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${LOGIN_DOMAIN}`;
}

/** 254712345678@phone.kazilink.invalid -> +254712345678, or null for any other address. */
export function loginToPhone(login: string | null | undefined): string | null {
  if (!login || !login.endsWith(`@${LOGIN_DOMAIN}`)) return null;
  return `+${login.slice(0, login.indexOf("@"))}`;
}

/** +254712345678 -> 0712 345 678 */
export function formatKenyanPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "").replace(/^254/, "");
  if (digits.length !== 9) return e164;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
