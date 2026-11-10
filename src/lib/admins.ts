/**
 * Phone numbers that become admins automatically when they create an account.
 * They skip the "waiting to be confirmed" step and can sign in straight away.
 *
 * Full format with country code, e.g. +254712345678.
 * Only add numbers you control: whoever creates the account for a number
 * listed here gets full admin rights.
 */
export const ADMIN_PHONES: readonly string[] = ["+254704957245"];

export function isAdminPhone(e164: string): boolean {
  return ADMIN_PHONES.includes(e164);
}
