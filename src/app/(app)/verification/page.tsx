import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { roleLabel } from "@/lib/types";
import { VerificationForm } from "./VerificationForm";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = ctx.activeProfile;
  const status = profile.verification_status;

  const { data: latest } = await ctx.supabase
    .from("verifications")
    .select("status, reviewer_note, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg">Verification</h1>
        <p className="max-w-[65ch] text-ink-muted">
          {profile.type === "employer"
            ? "Verified employers get the Verified badge, and their posts go public. It is free."
            : "A Verified badge shows employers you are who you say you are. It is free."}
        </p>
      </header>

      <Card className="flex items-center gap-4">
        <RoleBadge role={profile.type} verified={status === "verified"} size={56} />
        <div>
          <p className="text-title-sm">
            {status === "verified" && `Your ${roleLabel[profile.type].toLowerCase()} profile is verified`}
            {status === "pending" && "We are reviewing your details"}
            {status === "rejected" && "We could not verify you yet"}
            {status === "unverified" && "Not verified yet"}
          </p>
          <p className="text-body-sm text-ink-muted">
            {status === "verified" && "Nothing more to do."}
            {status === "pending" && "This usually takes less than two working days. We will send you an alert."}
            {status === "rejected" && (latest?.reviewer_note ?? "Please check your details and send them again.")}
            {status === "unverified" && "Send one document below to get started."}
          </p>
        </div>
      </Card>

      {(status === "unverified" || status === "rejected") && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-title-md">{status === "rejected" ? "Send your details again" : "Send your details"}</h2>
          <VerificationForm role={profile.type} />
        </Card>
      )}
    </>
  );
}
