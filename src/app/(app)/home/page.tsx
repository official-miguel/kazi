import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplyControl } from "@/components/ApplyControl";
import { JobCard } from "@/components/JobCard";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PostStatus } from "@/components/PostStatus";
import { StatusPill } from "@/components/ui/Pills";
import { getSessionContext, type ProfileSummary } from "@/lib/auth";
import { getAppliedMap, getJobsByIds, listOpenJobs } from "@/lib/data";
import type { ApplicationStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = ctx.activeProfile;
  const firstName = profile.full_name.split(" ")[0];

  return (
    <>
      <h1 className="text-title-lg">Welcome, {firstName}</h1>
      {profile.type === "employer" ? (
        <EmployerHome supabase={ctx.supabase} profile={profile} />
      ) : (
        <SeekerHome supabase={ctx.supabase} profile={profile} />
      )}
    </>
  );
}

/* ---------- Worker and Intern: matches near you, then recent applications ---------- */

async function SeekerHome({ supabase, profile }: { supabase: SupabaseClient; profile: ProfileSummary }) {
  const wantsPlacements = profile.type === "intern";

  const [nearby, applied, recentApps] = await Promise.all([
    profile.county_id ? listOpenJobs(supabase, { countyId: profile.county_id, limit: 12 }) : Promise.resolve([]),
    getAppliedMap(supabase, profile.id),
    supabase
      .from("applications")
      .select("id, job_id, status, updated_at")
      .eq("seeker_profile_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  // Interns see internships and attachments first; workers see jobs first.
  const rank = (type: string) => ((type === "job") === wantsPlacements ? 1 : 0);
  let jobs = [...nearby].sort((a, b) => rank(a.type) - rank(b.type));
  const fromNearby = jobs.length > 0;
  if (!fromNearby) jobs = (await listOpenJobs(supabase, { limit: 8 })).sort((a, b) => rank(a.type) - rank(b.type));
  jobs = jobs.slice(0, 8);

  const apps = (recentApps.data ?? []) as Array<{ id: string; job_id: string; status: ApplicationStatus }>;
  const appJobs = await getJobsByIds(supabase, apps.map((a) => a.job_id));
  const profileThin = !profile.headline;

  return (
    <>
      {profileThin && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-amber-soft">
          <div>
            <h2 className="text-title-sm">Finish your profile</h2>
            <p className="text-body-sm">Your profile is your CV. Add your skills and experience before you apply.</p>
          </div>
          <Link href="/me/edit" className={buttonClasses("primary")}>
            Finish profile
          </Link>
        </Card>
      )}

      {apps.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="apps-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="apps-heading" className="text-title-md">
              Your applications
            </h2>
            <Link href="/applications" className="text-label text-primary">
              See all
            </Link>
          </div>
          <Card className="flex flex-col divide-y divide-line p-0 md:p-0">
            {apps.map((a) => {
              const job = appJobs.get(a.job_id);
              return (
                <Link key={a.id} href="/applications" className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-sunken">
                  <span className="min-w-0">
                    <span className="block truncate text-label">{job?.title ?? "A post"}</span>
                    <span className="block text-body-sm text-ink-muted">{job?.employerName}</span>
                  </span>
                  <StatusPill status={a.status} />
                </Link>
              );
            })}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="jobs-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="jobs-heading" className="text-title-md">
            {fromNearby ? "Near you" : "Latest posts"}
          </h2>
          <Link href="/jobs" className="text-label text-primary">
            Search all
          </Link>
        </div>
        {jobs.length === 0 ? (
          <Card>
            <p className="text-ink-muted">No open posts yet. Check back soon.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard
                  job={job}
                  href={`/jobs/${job.id}`}
                  action={<ApplyControl jobId={job.id} role={profile.type} status={applied.get(job.id)} />}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ---------- Employer: a small dashboard ---------- */

async function EmployerHome({ supabase, profile }: { supabase: SupabaseClient; profile: ProfileSummary }) {
  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, status, deadline, applications(id, status)")
    .eq("employer_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const jobs = (jobRows ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    applications: Array<{ id: string; status: ApplicationStatus }>;
  }>;

  const live = jobs.filter((j) => j.status === "live").length;
  const waiting = jobs.filter((j) => j.status === "waiting").length;
  const allApps = jobs.flatMap((j) => j.applications);
  const fresh = allApps.filter((a) => a.status === "sent").length;
  const verified = profile.verification_status === "verified";

  const stats = [
    { label: "Live posts", value: live },
    { label: "Applicants", value: allApps.length },
    { label: "New, not yet seen", value: fresh },
  ];

  return (
    <>
      {!verified && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-amber-soft">
          <div>
            <h2 className="text-title-sm">
              {profile.verification_status === "pending" ? "We are checking your business" : "Get verified to go live"}
            </h2>
            <p className="max-w-[55ch] text-body-sm">
              {profile.verification_status === "pending"
                ? "Your posts will go live as soon as our team approves your details."
                : `Posts only go public once your business is verified.${waiting > 0 ? ` You have ${waiting} waiting.` : ""}`}
            </p>
          </div>
          {profile.verification_status !== "pending" && (
            <Link href="/verification" className={buttonClasses("primary")}>
              Get verified
            </Link>
          )}
        </Card>
      )}

      <ul className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Card className="flex h-full flex-col gap-1">
              <span className="text-display tabular-nums">{s.value}</span>
              <span className="text-body-sm text-ink-muted">{s.label}</span>
            </Card>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3" aria-labelledby="posts-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="posts-heading" className="text-title-md">
            Your posts
          </h2>
          <Link href="/posts/new" className={buttonClasses("primary")}>
            Post a job
          </Link>
        </div>
        {jobs.length === 0 ? (
          <Card>
            <p className="text-ink-muted">You have not posted yet. Posting takes about a minute.</p>
          </Card>
        ) : (
          <Card className="flex flex-col divide-y divide-line p-0 md:p-0">
            {jobs.slice(0, 6).map((j) => (
              <Link key={j.id} href={`/posts/${j.id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-sunken">
                <span className="min-w-0">
                  <span className="block truncate text-label">{j.title}</span>
                  <span className="block text-body-sm text-ink-muted">
                    {j.applications.length} {j.applications.length === 1 ? "applicant" : "applicants"}
                  </span>
                </span>
                <PostStatus status={j.status} />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
