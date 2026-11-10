import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { brand } from "@/lib/brand";

/** Simple landing page. */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-end gap-3">
        <RoleBadge role="worker" size={48} />
        <RoleBadge role="intern" size={48} />
        <RoleBadge role="employer" size={48} verified />
      </div>
      <h1 className="max-w-[18ch] text-display">{brand.name}</h1>
      <p className="max-w-[40ch] text-title-sm font-normal text-ink-muted">{brand.tagline}</p>
      <p className="self-start rounded-pill bg-amber-soft px-4 py-2 text-label text-amber-ink">{brand.promise}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/sign-in" className={buttonClasses("primary")}>
          Get started
        </Link>
        <Link href="/design-system" className={buttonClasses("ghost")}>
          See the design system
        </Link>
      </div>
    </main>
  );
}
