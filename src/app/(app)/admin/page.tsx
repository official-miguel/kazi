import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { formatKenyanPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPhoneAction, rejectSignUpAction } from "./actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const ctx = await getSessionContext();
  // People who are not admins should not even learn this page exists.
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

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const waiting = (data?.users ?? [])
    .filter((u) => u.phone && !u.phone_confirmed_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg">Admin</h1>
        <p className="text-ink-muted">Confirm new phone numbers so people can sign in without an SMS code.</p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-title-md">
          Numbers waiting to be confirmed ({waiting.length})
        </h2>
        <p className="max-w-[65ch] rounded-lg bg-amber-soft px-4 py-3 text-body-sm text-ink">
          <span className="text-label">Call the number first.</span> Confirm it only when the person who answers says
          they signed up. Anyone can type in a number that is not theirs.
        </p>

        {error && (
          <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
            We could not load the list. Check the secret key and try again.
          </p>
        )}

        {!error && waiting.length === 0 && (
          <Card>
            <p className="text-ink-muted">Nobody is waiting. New sign-ups will appear here.</p>
          </Card>
        )}

        <ul className="flex flex-col gap-3">
          {waiting.map((u) => (
            <li key={u.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-title-sm tabular-nums">{formatKenyanPhone(u.phone!)}</p>
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
    </>
  );
}
