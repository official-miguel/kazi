import { cn } from "@/lib/format";
import { jobTypeLabel, statusLabel, type ApplicationStatus, type JobType } from "@/lib/types";

const pill = "inline-flex items-center rounded-pill border text-caption";

const statusStyles: Record<ApplicationStatus, string> = {
  sent: "border-transparent bg-surface-sunken text-ink-muted",
  seen: "border-transparent bg-primary-soft text-primary",
  shortlisted: "border-transparent bg-amber-soft text-amber-ink",
  accepted: "border-transparent bg-primary text-on-primary",
  // Deliberately quiet. Never red.
  not_selected: "border-control bg-surface text-ink-muted",
};

/** Where one application stands. Always shows the word, never colour alone. */
export function StatusPill({ status, className }: { status: ApplicationStatus; className?: string }) {
  return <span className={cn(pill, "min-h-8 px-3", statusStyles[status], className)}>{statusLabel[status]}</span>;
}

const typeStyles: Record<JobType, string> = {
  job: "bg-amber-soft text-amber-ink",
  internship: "bg-primary-soft text-primary",
  attachment: "bg-primary-soft text-primary",
};

/** Job, Internship or Attachment. */
export function TypeChip({ type, className }: { type: JobType; className?: string }) {
  return (
    <span className={cn(pill, "border-transparent px-2.5 py-1", typeStyles[type], className)}>
      {jobTypeLabel[type]}
    </span>
  );
}
