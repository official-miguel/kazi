import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { formatKenyanPhone, loginToPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddAdminForm } from "./AddAdminForm";
import { confirmPhoneAction, rejectSignUpAction, removeAdminAction } from "./actions";

export const metadata: Metadata = { title: "Admin" };

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

  const [usersResult, adminsResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("accounts").select("id, phone, email, created_at").eq("is_admin", true).order("created_at"),
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

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg">Admin portal</h1>
        <p className="text-ink-muted">Confirm new phone numbers and manage who else is an admin.</p>
      </header>

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
    </>
  );
}
