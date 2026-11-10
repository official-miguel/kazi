import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Supabase with full rights. SERVER ONLY: use it in server actions and server
 * pages, and only after checking who is asking. It skips every security rule.
 *
 * Needs SUPABASE_SECRET_KEY in .env.local (and in Vercel). Returns null when
 * the key has not been added yet, so callers can show a clear message.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;
  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
