import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const ctx = await getSessionContext();
  if (ctx?.account?.is_admin) redirect("/admin");
  if (ctx) redirect(ctx.profiles.length > 0 ? "/home" : "/onboarding");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="self-start text-title-md text-primary">
          {brand.name}
        </Link>
        <h1 className="text-title-lg">Sign in or join</h1>
        <p className="text-ink-muted">All you need is your phone number and a PIN.</p>
      </header>
      <Card>
        <SignInForm />
      </Card>
    </main>
  );
}
