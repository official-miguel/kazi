import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pills";
import { VerifiedSeal } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { getJobsByIds } from "@/lib/data";
import { formatShortDate } from "@/lib/format";
import { statusLabel, type ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Applications" };

const explain: Record<ApplicationStatus, string> = {
  sent: "The employer has your profile. They have not opened it yet.",
  seen: "The employer has opened your profile.",
  shortlisted: "You are on the shortlist. The employer can now see your phone number and may call you.",
  accepted: "You were accepted. Expect a call from the employer.",
  not_selected: "You were not selected this time. Keep applying.",
};

export default async function ApplicationsPage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  if (ctx.activeProfile.type === "employer") redirect("/posts");

  const { data } = await ctx.supabase
    .from("applications")
    .select("id, job_id, status, created_at, application_events(status, created_at)")
    .eq("seeker_profile_id", ctx.activeProfile.id)
    .order("created_at", { ascending: false });

  const apps = (data ?? []) as Array<{
    id: string;
    job_id: string;
    status: ApplicationStatus;
    created_at: string;
    application_events: Array<{ status: ApplicationStatus; created_at: string }>;
  }>;
  const jobs = await getJobsByIds(ctx.supabase, apps.map((a) => a.job_id));

  return (
    <>
      <h1 className="text-title-lg">Your applications</h1>

      {apps.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-ink-muted">You have not applied to anything yet. Applying takes one tap.</p>
          <Link href="/jobs" className={buttonClasses("primary")}>
            Find work
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {apps.map((a) => {
            const job = jobs.get(a.job_id);
            const events = [...a.application_events].sort((x, y) => x.created_at.localeCompare(y.created_at));
            return (
              <li key={a.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-title-sm">
                        {job ? (
                          <Link href={`/jobs/${job.id}`} className="hover:text-primary hover:underline">
                            {job.title}
                          </Link>
                        ) : (
                          "This post was removed"
                        )}
                      </h2>
                      {job && (
                        <p className="flex items-center gap-1 text-body-sm text-ink-muted">
                          {job.employerName}
                          {job.employerVerified && <VerifiedSeal label="Verified employer" size={16} />}
                          <span>· {[job.town, job.county].filter(Boolean).join(", ")}</span>
                        </p>
                      )}
                    </div>
                    <StatusPill status={a.status} />
                  </div>

                  <p className="text-body-sm">{explain[a.status]}</p>

                  <ol className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-body-sm text-ink-muted" aria-label="History">
                    {events.map((e, i) => (
                      <li key={i}>
                        <span className="text-label text-ink">{statusLabel[e.status]}</span> {formatShortDate(e.created_at.slice(0, 10))}
                      </li>
                    ))}
                  </ol>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
