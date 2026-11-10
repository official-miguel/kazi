const styles: Record<string, string> = {
  live: "bg-primary-soft text-primary",
  waiting: "bg-amber-soft text-amber-ink",
  draft: "bg-surface-sunken text-ink-muted",
  closed: "bg-surface-sunken text-ink-muted",
};

const labels: Record<string, string> = {
  live: "Live",
  waiting: "Waiting for verification",
  draft: "Draft",
  closed: "Closed",
};

/** Where an employer's post stands. */
export function PostStatus({ status }: { status: string }) {
  return (
    <span className={`rounded-pill px-3 py-1.5 text-caption ${styles[status] ?? styles.draft}`}>
      {labels[status] ?? status}
    </span>
  );
}
