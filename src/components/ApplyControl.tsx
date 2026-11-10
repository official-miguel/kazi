import { applyAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Pills";
import type { ApplicationStatus, Role } from "@/lib/types";

interface ApplyControlProps {
  jobId: string;
  /** The viewer's active role. Employers do not apply. */
  role: Role;
  /** Set when the viewer has already applied. */
  status?: ApplicationStatus;
}

/** One-tap Apply, or the application's status once applied. */
export function ApplyControl({ jobId, role, status }: ApplyControlProps) {
  if (status) return <StatusPill status={status} />;
  if (role === "employer") return null;
  return (
    <form action={applyAction}>
      <input type="hidden" name="job_id" value={jobId} />
      <Button type="submit">Apply</Button>
    </form>
  );
}
