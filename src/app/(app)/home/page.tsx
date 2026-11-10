import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { roleLabel } from "@/lib/types";

export const metadata: Metadata = { title: "Home" };

/** Placeholder home. The real feed and dashboard arrive in later build steps. */
export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = ctx.activeProfile;
  const firstName = profile.full_name.split(" ")[0];

  return (
    <Card className="flex flex-col items-start gap-4">
      <RoleBadge role={profile.type} verified={profile.verification_status === "verified"} size={64} />
      <div>
        <h1 className="text-title-lg">Karibu, {firstName}</h1>
        <p className="text-ink-muted">
          You are signed in as {profile.type === "employer" ? "an" : profile.type === "intern" ? "an" : "a"}{" "}
          {roleLabel[profile.type].toLowerCase()}.
        </p>
      </div>
      <p className="max-w-[60ch] text-body-sm text-ink-muted">
        {profile.type === "employer"
          ? "Next you will be able to post a job or attachment and see who applies."
          : "Next you will be able to finish your profile, then browse and apply for jobs near you."}
      </p>
    </Card>
  );
}
