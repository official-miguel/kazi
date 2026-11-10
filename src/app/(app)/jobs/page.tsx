import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplyControl } from "@/components/ApplyControl";
import { JobCard } from "@/components/JobCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { getSessionContext } from "@/lib/auth";
import { getAppliedMap, getCategories, getCounties, listOpenJobs } from "@/lib/data";
import type { JobType } from "@/lib/types";

export const metadata: Metadata = { title: "Jobs" };

const types: JobType[] = ["job", "internship", "attachment"];

interface Props {
  searchParams: Promise<{ q?: string; type?: string; county?: string; category?: string }>;
}

export default async function JobsPage({ searchParams }: Props) {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profile = ctx.activeProfile;
  const sp = await searchParams;

  const q = (sp.q ?? "").trim().slice(0, 60);
  const type = types.includes(sp.type as JobType) ? (sp.type as JobType) : undefined;
  const countyId = Number(sp.county) || undefined;
  const categoryId = Number(sp.category) || undefined;
  const filtered = Boolean(q || type || countyId || categoryId);

  const [jobs, counties, categories, applied] = await Promise.all([
    listOpenJobs(ctx.supabase, { q, type, countyId, categoryId, limit: 40 }),
    getCounties(ctx.supabase),
    getCategories(ctx.supabase),
    profile.type === "employer" ? Promise.resolve(new Map()) : getAppliedMap(ctx.supabase, profile.id),
  ]);

  return (
    <>
      <h1 className="text-title-lg">Find work</h1>

      <Card>
        <form action="/jobs" className="flex flex-col gap-4">
          <TextField id="q" name="q" label="Search" type="search" defaultValue={q} placeholder="Electrician, driver, accounts…" />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField id="type" name="type" label="Type" defaultValue={type ?? ""}>
              <option value="">All types</option>
              <option value="job">Jobs</option>
              <option value="internship">Internships</option>
              <option value="attachment">Attachments</option>
            </SelectField>
            <SelectField id="county" name="county" label="County" defaultValue={countyId ?? ""}>
              <option value="">All counties</option>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <SelectField id="category" name="category" label="Category" defaultValue={categoryId ?? ""}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Icon name="filter" size={20} />
              Show results
            </Button>
            {filtered && (
              <Link href="/jobs" className={buttonClasses("ghost")}>
                Clear filters
              </Link>
            )}
          </div>
        </form>
      </Card>

      <p className="text-body-sm text-ink-muted" role="status">
        {jobs.length === 0 ? "No open posts match." : `${jobs.length} open ${jobs.length === 1 ? "post" : "posts"}`}
      </p>

      {jobs.length === 0 ? (
        <Card>
          <p className="text-ink-muted">
            {filtered ? "Try a different word, or clear the filters to see everything." : "No posts yet. Check back soon."}
          </p>
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
    </>
  );
}
