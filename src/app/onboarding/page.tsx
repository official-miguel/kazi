import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getSessionContext } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  const takenRoles = ctx.profiles.map((p) => p.type);
  if (takenRoles.length >= 3) redirect("/home");

  const { data: counties } = await ctx.supabase.from("counties").select("id, name").order("name");
  const isFirst = takenRoles.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-title-md text-primary">{brand.name}</p>
        <h1 className="text-title-lg">{isFirst ? "Welcome. Let us set you up." : "Add another profile"}</h1>
        <p className="text-ink-muted">This takes about a minute. You can add more to your profile later.</p>
      </header>
      <Card>
        <OnboardingForm counties={counties ?? []} takenRoles={takenRoles} />
      </Card>
    </main>
  );
}
