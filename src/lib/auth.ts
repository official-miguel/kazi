import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface ProfileSummary {
  id: string;
  type: Role;
  full_name: string;
  headline: string | null;
  town: string | null;
  county_id: number | null;
  photo_path: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
}

/**
 * Who is signed in, which profiles they hold, and which one is active.
 * Returns null when nobody is signed in.
 *
 * Two things keep this fast, because it runs on every screen:
 *  - `cache` means the layout and the page share one lookup per request.
 *  - `getClaims` checks the sign-in token on our own server where it can,
 *    which avoids a round trip to Supabase on every tap.
 */
export const getSessionContext = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const user = { id: userId };

  const [accountResult, profilesResult] = await Promise.all([
    supabase.from("accounts").select("id, phone, active_profile_id, is_admin").eq("id", user.id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, type, full_name, headline, town, county_id, photo_path, verification_status")
      .eq("account_id", user.id)
      .order("created_at"),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileSummary[];
  const account = accountResult.data as {
    id: string;
    phone: string | null;
    active_profile_id: string | null;
    is_admin: boolean;
  } | null;
  const activeProfile = profiles.find((p) => p.id === account?.active_profile_id) ?? profiles[0] ?? null;

  return { supabase, user, account, profiles, activeProfile };
});
