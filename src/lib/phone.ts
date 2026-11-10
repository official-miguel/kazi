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

/** +254712345678 -> 0712 345 678 */
export function formatKenyanPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "").replace(/^254/, "");
  if (digits.length !== 9) return e164;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
