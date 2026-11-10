import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { getSessionContext } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { formatKenyanPhone, loginToPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabel, type Role } from "@/lib/types";
import { AddAdminForm } from "./AddAdminForm";
import {
  closeReportedPostAction,
  confirmPhoneAction,
  dismissReportsAction,
  loadDemoDataAction,
  rejectSignUpAction,
  removeAdminAction,
  removeDemoDataAction,
  reviewVerificationAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin" };

const docLabel: Record<string, string> = {
  national_id: "National ID",
  student_id: "Student ID",
  institution_letter: "Institution letter",
  business_registration: "Business registration",
  kra_pin: "KRA PIN",
};

const reasonLabel: Record<string, string> = {
  asks_for_money: "Asks for money",
  fake_job: "Looks fake",
  wrong_details: "Wrong details",
  offensive: "Offensive",
  other: "Other",
};

interface VerificationRow {
  id: string;
  doc_type: string;
  doc_number: string | null;
  document_path: string | null;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  institution_name: string | null;
  created_at: string;
  profile: { id: string; full_name: string; type: Role; town: string | null; employer_details: { business_name: string } | null } | null;
}

interface ReportRow {
  id: number;
  reason: string;
  details: string | null;
  job: { id: string; title: string; status: string } | null;
}

export default async function AdminPage() {
  const ctx = await getSessionContext();
  if (!ctx?.account?.is_admin) notFound();

  const admin = createAdminClient();
  if (!admin) {
    return (
      <Card>
        <h1 className="text-title-lg">Admin</h1>
        <p className="text-ink-muted">
          The admin portal needs the Supabase secret key. Add SUPABASE_SECRET_KEY to the server settings, then reload.
        </p>
      </Card>
    );
  }

  const [usersResult, adminsResult, verificationsResult, reportsResult, demoResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("accounts").select("id, phone, email, created_at").eq("is_admin", true).order("created_at"),
    admin
      .from("verifications")
      .select(
        "id, doc_type, doc_number, document_path, contact_person_name, contact_person_phone, institution_name, created_at, profile:profiles(id, full_name, type, town, employer_details(business_name))",
      )
      .eq("status", "pending")
      .order("created_at"),
    admin.from("job_reports").select("id, reason, details, job:jobs(id, title, status)").is("resolved_at", null).order("created_at"),
    admin.from("accounts").select("id", { count: "exact", head: true }).like("email", "%@demo.kazilink.invalid"),
  ]);

  const waiting = (usersResult.data?.users ?? [])
    .map((u) => ({
      id: u.id,
      created_at: u.created_at,
      confirmed: Boolean(u.email_confirmed_at),
      phone: loginToPhone(u.email),
    }))
    .filter((u): u is typeof u & { phone: string } => u.phone !== null && !u.confirmed)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const admins = (adminsResult.data ?? []) as Array<{ id: string; phone: string | null; email: string | null }>;

  // Short-lived links so the reviewer can open each private document.
  const verifications = await Promise.all(
    ((verificationsResult.data ?? []) as unknown as VerificationRow[]).map(async (v) => {
      let url: string | null = null;
      if (v.document_path) {
        const { data } = await admin.storage.from("verification-docs").createSignedUrl(v.document_path, 600);
        url = data?.signedUrl ?? null;
      }
      return { ...v, url };
    }),
  );

  // Group reports by post.
  const reported = new Map<string, { job: NonNullable<ReportRow["job"]>; reports: ReportRow[] }>();
  for (const r of (reportsResult.data ?? []) as unknown as ReportRow[]) {
    if (!r.job) continue;
    const entry = reported.get(r.job.id) ?? { job: r.job, reports: [] };
    entry.reports.push(r);
    reported.set(r.job.id, entry);
  }

  const demoLoaded = (demoResult.count ?? 0) > 0;

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg">Admin portal</h1>
        <p className="text-ink-muted">Confirm numbers, review verification requests, handle reports and manage admins.</p>
      </header>

      {/* ---------- Phone numbers ---------- */}
      <section className="flex flex-col gap-3" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-title-md">
          Numbers waiting to be confirmed ({waiting.length})
        </h2>
        <p className="max-w-[65ch] rounded-lg bg-amber-soft px-4 py-3 text-body-sm text-ink">
          <span className="text-label">Call the number first.</span> Confirm it only when the person who answers says
          they signed up. Anyone can type in a number that is not theirs.
        </p>

        {usersResult.error && (
          <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
            We could not load the list. Check the secret key and try again.
          </p>
        )}
        {!usersResult.error && waiting.length === 0 && (
          <Card>
            <p className="text-ink-muted">Nobody is waiting. New sign-ups will appear here.</p>
          </Card>
        )}
        <ul className="flex flex-col gap-3">
          {waiting.map((u) => (
            <li key={u.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-title-sm tabular-nums">{formatKenyanPhone(u.phone)}</p>
                  <p className="text-body-sm text-ink-muted">Joined {formatShortDate(u.created_at.slice(0, 10))}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={confirmPhoneAction}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <Button type="submit">Confirm number</Button>
                  </form>
                  <form action={rejectSignUpAction}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <Button type="submit" variant="danger">
                      Remove
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Verification requests ---------- */}
      <section className="flex flex-col gap-3" aria-labelledby="verify-heading">
        <h2 id="verify-heading" className="text-title-md">
          Verification requests ({verifications.length})
        </h2>
        {verifications.length === 0 && (
          <Card>
            <p className="text-ink-muted">No requests to review.</p>
          </Card>
        )}
        <ul className="flex flex-col gap-3">
          {verifications.map((v) => (
            <li key={v.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {v.profile && <RoleBadge role={v.profile.type} size={40} />}
                  <div className="min-w-0">
                    <p className="text-title-sm">
                      {v.profile?.employer_details?.business_name ?? v.profile?.full_name ?? "Unknown profile"}
                    </p>
                    <p className="text-body-sm text-ink-muted">
                      {v.profile ? roleLabel[v.profile.type] : ""}
                      {v.profile?.town ? ` · ${v.profile.town}` : ""} · Sent {formatShortDate(v.created_at.slice(0, 10))}
                    </p>
                  </div>
                </div>
                <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-caption text-ink-muted uppercase">Document</dt>
                    <dd>
                      {docLabel[v.doc_type] ?? v.doc_type}: <span className="text-label">{v.doc_number}</span>
                    </dd>
                  </div>
                  {v.institution_name && (
                    <div>
                      <dt className="text-caption text-ink-muted uppercase">Institution</dt>
                      <dd>{v.institution_name}</dd>
                    </div>
                  )}
                  {v.contact_person_name && (
                    <div>
                      <dt className="text-caption text-ink-muted uppercase">Contact person</dt>
                      <dd>
                        {v.contact_person_name} · {v.contact_person_phone}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-caption text-ink-muted uppercase">File</dt>
                    <dd>
                      {v.url ? (
                        <a href={v.url} target="_blank" rel="noreferrer" className="text-label text-primary underline">
                          Open document
                        </a>
                      ) : (
                        "No file sent"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {v.profile && (
                    <Link href={`/people/${v.profile.id}`} className="flex min-h-12 items-center px-2 text-label text-primary underline">
                      View profile
                    </Link>
                  )}
                </div>
                <form action={reviewVerificationAction} className="flex flex-col gap-3 border-t border-line pt-3">
                  <input type="hidden" name="verification_id" value={v.id} />
                  <TextField id={`note-${v.id}`} name="note" label="Note to the person (shown if you reject)" maxLength={500} placeholder="The photo is blurry. Please send a clearer one." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" name="decision" value="approve">
                      Approve
                    </Button>
                    <Button type="submit" name="decision" value="reject" variant="danger">
                      Reject
                    </Button>
                  </div>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Reported posts ---------- */}
      <section className="flex flex-col gap-3" aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="text-title-md">
          Reported posts ({reported.size})
        </h2>
        {reported.size === 0 && (
          <Card>
            <p className="text-ink-muted">No reports to handle.</p>
          </Card>
        )}
        <ul className="flex flex-col gap-3">
          {[...reported.values()].map(({ job, reports }) => (
            <li key={job.id}>
              <Card className="flex flex-col gap-3">
                <div>
                  <p className="text-title-sm">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      {job.title}
                    </Link>
                  </p>
                  <p className="text-body-sm text-ink-muted">
                    {reports.length} {reports.length === 1 ? "report" : "reports"} · Post is {job.status}
                  </p>
                </div>
                <ul className="flex flex-col gap-1 text-body-sm">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <span className="text-label">{reasonLabel[r.reason] ?? r.reason}</span>
                      {r.details ? `: ${r.details}` : ""}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <form action={closeReportedPostAction}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <Button type="submit" variant="danger">
                      Close the post
                    </Button>
                  </form>
                  <form action={dismissReportsAction}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <Button type="submit" variant="secondary">
                      The post is fine
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Admins ---------- */}
      <section className="flex flex-col gap-3" aria-labelledby="admins-heading">
        <h2 id="admins-heading" className="text-title-md">
          Admins ({admins.length})
        </h2>
        <ul className="flex flex-col gap-3">
          {admins.map((a) => {
            const phone = loginToPhone(a.email) ?? (a.phone ? `+${a.phone}` : null);
            const isMe = a.id === ctx.account?.id;
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-title-sm tabular-nums">
                    {phone ? formatKenyanPhone(phone) : "Unknown number"}
                    {isMe && <span className="ml-2 text-body-sm font-normal text-ink-muted">(you)</span>}
                  </p>
                  {!isMe && (
                    <form action={removeAdminAction}>
                      <input type="hidden" name="account_id" value={a.id} />
                      <Button type="submit" variant="danger">
                        Remove admin
                      </Button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
        <Card className="flex flex-col gap-4">
          <div>
            <h3 className="text-title-sm">Add an admin</h3>
            <p className="max-w-[65ch] text-body-sm text-ink-muted">
              Admins can confirm numbers and add or remove other admins. Only add people you trust.
            </p>
          </div>
          <AddAdminForm />
        </Card>
      </section>

      {/* ---------- Demo data ---------- */}
      <section className="flex flex-col gap-3" aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="text-title-md">
          Demo data
        </h2>
        <Card className="flex flex-col items-start gap-3">
          <p className="max-w-[65ch] text-body-sm text-ink-muted">
            {demoLoaded
              ? "Demo employers and posts are loaded. Remove them before you launch. Removing also deletes any applications sent to those posts."
              : "Add six made-up verified employers with eleven live posts across Kenya, so there is something to browse and apply to while testing."}
          </p>
          {demoLoaded ? (
            <form action={removeDemoDataAction}>
              <Button type="submit" variant="danger">
                Remove demo data
              </Button>
            </form>
          ) : (
            <form action={loadDemoDataAction}>
              <Button type="submit" variant="secondary">
                Load demo data
              </Button>
            </form>
          )}
        </Card>
      </section>
    </>
  );
}
