import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reportJobAction } from "@/app/(app)/actions";
import { ApplyControl } from "@/components/ApplyControl";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Pills";
import { VerifiedSeal } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { getAppliedMap, getJob, today } from "@/lib/data";
import { formatPay, formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(await createClient(), id);
  return { title: job ? `${job.title} at ${job.employerName}` : "Post not found" };
}

/** A single post. Anyone with the link can read it; applying needs an account. */
export default async function JobPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { reported } = await searchParams;
  const ctx = await getSessionContext();
  const supabase = ctx?.supabase ?? (await createClient());

  const job = await getJob(supabase, id);
  if (!job) notFound();

  const profile = ctx?.activeProfile ?? null;
  const isOwner = Boolean(profile && profile.id === job.employerProfileId);
  const open = job.status === "live" && job.deadline >= today();
  const status = profile && profile.type !== "employer" ? (await getAppliedMap(supabase, profile.id)).get(job.id) : undefined;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link href={ctx ? "/home" : "/"} className="text-title-md text-primary">
            {brand.name}
          </Link>
          <Link href={ctx ? "/jobs" : "/sign-in"} className={buttonClasses("ghost")}>
            {ctx ? "All jobs" : "Sign in"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <Card className="flex flex-col gap-4">
          <TypeChip type={job.type} className="self-start" />
          <h1 className="text-title-lg">{job.title}</h1>
          <p className="flex items-center gap-1 text-title-sm">
            <Link href={ctx ? `/people/${job.employerProfileId}` : "/sign-in"} className="hover:underline">
              {job.employerName}
            </Link>
            {job.employerVerified && <VerifiedSeal label="Verified employer" size={20} />}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-ink-muted uppercase">Where</dt>
              <dd className="flex items-center gap-1">
                <Icon name="location" size={20} />
                {[job.town, job.county].filter(Boolean).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted uppercase">{job.type === "job" ? "Pay" : "Stipend"}</dt>
              <dd className="text-label">{formatPay(job)}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted uppercase">Apply by</dt>
              <dd>{formatShortDate(job.deadline)}</dd>
            </div>
            {job.categoryName && (
              <div>
                <dt className="text-caption text-ink-muted uppercase">Category</dt>
                <dd>{job.categoryName}</dd>
              </div>
            )}
          </dl>

          {!open && (
            <p className="rounded-lg bg-surface-sunken px-4 py-3 text-body-sm text-ink-muted">
              {job.status === "waiting"
                ? "This post is waiting for the employer to be verified. It is not public yet."
                : "This post is closed. It is no longer taking applications."}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {open && profile && !isOwner && <ApplyControl jobId={job.id} role={profile.type} status={status} />}
            {!open && status && <ApplyControl jobId={job.id} role="worker" status={status} />}
            {open && !ctx && (
              <Link href="/sign-in" className={buttonClasses("primary")}>
                Sign in to apply
              </Link>
            )}
            {isOwner && (
              <Link href={`/posts/${job.id}`} className={buttonClasses("primary")}>
                See applicants
              </Link>
            )}
            {open && profile?.type === "employer" && !isOwner && (
              <p className="text-body-sm text-ink-muted">Switch to a Worker or Intern profile to apply.</p>
            )}
          </div>
        </Card>

        {job.description && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-title-md">About the work</h2>
            <p className="max-w-[65ch] whitespace-pre-line">{job.description}</p>
          </Card>
        )}

        {job.requirements && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-title-md">What you need</h2>
            <p className="max-w-[65ch] whitespace-pre-line">{job.requirements}</p>
          </Card>
        )}

        {ctx && !isOwner && (
          <Card>
            {reported ? (
              <p role="status" className="text-body-sm">
                <span className="text-label">Thank you.</span> Our team will look at this post.
              </p>
            ) : (
              <details>
                <summary className="flex min-h-12 cursor-pointer items-center text-label text-danger">Report this post</summary>
                <form action={reportJobAction} className="flex flex-col gap-4 pt-2">
                  <input type="hidden" name="job_id" value={job.id} />
                  <SelectField id="reason" name="reason" label="What is wrong?" defaultValue="asks_for_money" required>
                    <option value="asks_for_money">It asks for money or a fee</option>
                    <option value="fake_job">The job looks fake</option>
                    <option value="wrong_details">The details are wrong</option>
                    <option value="offensive">It is offensive</option>
                    <option value="other">Something else</option>
                  </SelectField>
                  <TextField id="details" name="details" label="Tell us more (optional)" maxLength={500} />
                  <div>
                    <Button type="submit" variant="danger">
                      Send report
                    </Button>
                  </div>
                </form>
              </details>
            )}
          </Card>
        )}
      </main>
    </>
  );
}
