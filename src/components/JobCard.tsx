import type { ReactNode } from "react";
import { formatPay, formatShortDate } from "@/lib/format";
import type { JobSummary } from "@/lib/types";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { TypeChip } from "./ui/Pills";
import { VerifiedSeal } from "./ui/RoleBadge";

interface JobCardProps {
  job: JobSummary;
  /** The Apply button, or the status pill once the viewer has applied. */
  action?: ReactNode;
}

/** One post in a list. Kept light on purpose: no logos, no images. */
export function JobCard({ job, action }: JobCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <TypeChip type={job.type} className="self-start" />
      <h3 className="text-title-sm">{job.title}</h3>
      <p className="flex items-center gap-1 text-label">
        {job.employerName}
        {job.employerVerified && <VerifiedSeal label="Verified employer" />}
      </p>
      <p className="flex items-center gap-1 text-body-sm text-ink-muted">
        <Icon name="location" size={20} />
        <span>
          {job.town}, {job.county} · Closes {formatShortDate(job.deadline)}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-label">{formatPay(job)}</span>
        {action}
      </div>
    </Card>
  );
}
