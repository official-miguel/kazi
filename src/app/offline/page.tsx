import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "You are offline" };

/** Shown by the service worker when a page cannot be loaded. Uses a plain link so it works with no network. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <p className="text-title-md text-primary">{brand.name}</p>
      <h1 className="text-title-lg">You are offline</h1>
      <p className="text-ink-muted">
        We could not reach the internet. Check your data or Wi-Fi, then try again. Nothing you did has been lost.
      </p>
      <div>
        {/* A plain link on purpose: a full reload retries the network. */}
        <a
          href="/home"
          className="inline-flex min-h-12 items-center justify-center rounded-pill bg-primary px-6 text-label text-on-primary hover:bg-primary-strong"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
