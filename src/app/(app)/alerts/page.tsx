import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");
  const profileId = ctx.activeProfile.id;

  const { data } = await ctx.supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  const alerts = (data ?? []) as Array<{
    id: number;
    title: string;
    body: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }>;

  // Opening this page counts as reading them. The list above still shows which were new.
  if (alerts.some((a) => !a.read_at)) {
    await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .is("read_at", null);
  }

  return (
    <>
      <h1 className="text-title-lg">Alerts</h1>

      {alerts.length === 0 ? (
        <Card>
          <p className="text-ink-muted">Nothing yet. We will tell you here when something changes.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((a) => {
            const content = (
              <Card className={`flex flex-col gap-1 ${a.read_at ? "" : "border-primary bg-primary-soft"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-title-sm">
                    {!a.read_at && <span className="sr-only">New: </span>}
                    {a.title}
                  </h2>
                  <span className="text-body-sm text-ink-muted">{formatShortDate(a.created_at.slice(0, 10))}</span>
                </div>
                {a.body && <p className="text-body-sm">{a.body}</p>}
              </Card>
            );
            // Alerts about one application open the full applications list.
            const href = a.link?.startsWith("/applications") ? "/applications" : a.link;
            return (
              <li key={a.id}>
                {href ? (
                  <Link href={href} className="block rounded-lg">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
