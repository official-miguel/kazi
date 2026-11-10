import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostStatus } from "@/components/PostStatus";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/Pills";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { getJob } from "@/lib/data";
import { formatPay, formatShortDate } from "@/lib/format";
import { formatKenyanPhone } from "@/lib/phone";
import type { ApplicationStatus, Role } from "@/lib/types";
import { setApplicationStatusAction, setPostStatusAction } from "../actions";

export const metadata: Metadata = { title: "Applicants" };

interface ApplicantRow {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  seeker: {
    id: string;
    full_name: string;
    headline: string | null;
    town: string | null;
    type: Role;
    verification_status: string;
  } | null;
}

const order: ApplicationStatus[] = ["shortlisted", "sent", "seen", "accepted", "not_selected"];

function MoveButton({ applicationId, jobId, status, label, variant }: {
  applicationId: string;
  jobId: string;
  status: "shortlisted" | "accepted" | "not_selected";
  label: string;
  variant: "primary" | "secondary" | "danger";
}) {
  return (
    <form action={setApplicationStatusAction}>
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

/** The employer's view of one post: its applicants, with shortlist, accept and decline. */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const { id } = await params;

  const job = await getJob(ctx.supabase, id);
  if (!job || job.employerProfileId !== ctx.activeProfile.id) notFound();

  const { data } = await ctx.supabase
    .from("applications")
    .select("id, status, created_at, seeker:profiles!seeker_profile_id(id, full_name, headline, town, type, verification_status)")
    .eq("job_id", id)
    .order("created_at");

  const applicants = ((data ?? []) as unknown as ApplicantRow[])
    .filter((a) => a.seeker)
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  // Phone numbers are only released for shortlisted or accepted applicants.
  const phones = new Map<string, string>();
  await Promise.all(
    applicants
      .filter((a) => a.status === "shortlisted" || a.status === "accepted")
      .map(async (a) => {
        const { data: phone } = await ctx.supabase.rpc("get_applicant_phone", { _application_id: a.id });
        if (typeof phone === "string" && phone) phones.set(a.id, phone);
      }),
  );

  const closed = job.status === "closed";

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-title-lg">{job.title}</h1>
            <p className="text-body-sm text-ink-muted">
              {[job.town, job.county].filter(Boolean).join(", ")} · {formatPay(job)} · Closes {formatShortDate(job.deadline)}
            </p>
          </div>
          <PostStatus status={job.status} />
        </div>
        {job.status === "waiting" && (
          <p className="rounded-lg bg-amber-soft px-4 py-3 text-body-sm">
            This post is saved. It goes public as soon as your business is verified.{" "}
            <Link href="/verification" className="text-label text-primary underline">
              Get verified
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/${job.id}`} className={buttonClasses("secondary")}>
            View post
          </Link>
          <form action={setPostStatusAction}>
            <input type="hidden" name="job_id" value={job.id} />
            <input type="hidden" name="status" value={closed ? "live" : "closed"} />
            <Button type="submit" variant={closed ? "secondary" : "danger"}>
              {closed ? "Open again" : "Close this post"}
            </Button>
          </form>
        </div>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="applicants-heading">
        <h2 id="applicants-heading" className="text-title-md">
          Applicants ({applicants.length})
        </h2>

        {applicants.length === 0 ? (
          <Card>
            <p className="text-ink-muted">Nobody has applied yet. Applicants will appear here.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {applicants.map((a) => {
              const s = a.seeker!;
              const phone = phones.get(a.id);
              const digits = phone?.replace(/\D/g, "");
              const canShortlist = a.status === "sent" || a.status === "seen";
              const canDecline = canShortlist || a.status === "shortlisted";
              return (
                <li key={a.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <RoleBadge role={s.type} verified={s.verification_status === "verified"} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-title-sm">{s.full_name}</p>
                          <p className="text-body-sm text-ink-muted">
                            {[s.headline, s.town].filter(Boolean).join(" · ") || "No headline yet"}
                          </p>
                          <p className="text-body-sm text-ink-muted">Applied {formatShortDate(a.created_at.slice(0, 10))}</p>
                        </div>
                      </div>
                      <StatusPill status={a.status} />
                    </div>

                    {phone && digits && (
                      <p className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft px-4 py-3">
                        <span className="text-label tabular-nums">{formatKenyanPhone(phone)}</span>
                        <a href={`tel:+${digits}`} className="text-label text-primary underline">
                          Call
                        </a>
                        <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="text-label text-primary underline">
                          WhatsApp
                        </a>
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/people/${s.id}?application=${a.id}&post=${job.id}`} className={buttonClasses("secondary")}>
                        View profile
                      </Link>
                      {canShortlist && <MoveButton applicationId={a.id} jobId={job.id} status="shortlisted" label="Shortlist" variant="primary" />}
                      {a.status === "shortlisted" && <MoveButton applicationId={a.id} jobId={job.id} status="accepted" label="Accept" variant="primary" />}
                      {canDecline && <MoveButton applicationId={a.id} jobId={job.id} status="not_selected" label="Decline" variant="danger" />}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
