import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PostStatus } from "@/components/PostStatus";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "My posts" };

export default async function PostsPage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  if (ctx.activeProfile.type !== "employer") redirect("/home");

  const { data } = await ctx.supabase
    .from("jobs")
    .select("id, title, status, deadline, applications(id, status)")
    .eq("employer_profile_id", ctx.activeProfile.id)
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    deadline: string;
    applications: Array<{ id: string; status: string }>;
  }>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-lg">My posts</h1>
        <Link href="/posts/new" className={buttonClasses("primary")}>
          Post a job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <p className="text-ink-muted">You have not posted yet. Posting takes about a minute.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((j) => {
            const fresh = j.applications.filter((a) => a.status === "sent").length;
            return (
              <li key={j.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-title-sm">
                      <Link href={`/posts/${j.id}`} className="hover:text-primary hover:underline">
                        {j.title}
                      </Link>
                    </h2>
                    <p className="text-body-sm text-ink-muted">
                      {j.applications.length} {j.applications.length === 1 ? "applicant" : "applicants"}
                      {fresh > 0 ? ` · ${fresh} new` : ""} · Closes {formatShortDate(j.deadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PostStatus status={j.status} />
                    <Link href={`/posts/${j.id}`} className={buttonClasses("secondary")}>
                      See applicants
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
