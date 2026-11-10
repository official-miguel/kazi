export type Role = "worker" | "intern" | "employer";

export type JobType = "job" | "internship" | "attachment";

export type ApplicationStatus = "sent" | "seen" | "shortlisted" | "accepted" | "not_selected";

export type PayPeriod = "day" | "week" | "month";

export interface JobSummary {
  id: string;
  title: string;
  type: JobType;
  employerName: string;
  employerVerified: boolean;
  town: string;
  county: string;
  /** Pay or stipend in KES. Leave both empty for "Pay not stated". */
  payMin?: number;
  payMax?: number;
  payPeriod?: PayPeriod;
  /** ISO date, e.g. 2026-11-28 */
  deadline: string;
}

export const roleLabel: Record<Role, string> = {
  worker: "Worker",
  intern: "Intern",
  employer: "Employer",
};

export const jobTypeLabel: Record<JobType, string> = {
  job: "Job",
  internship: "Internship",
  attachment: "Attachment",
};

export const statusLabel: Record<ApplicationStatus, string> = {
  sent: "Sent",
  seen: "Seen",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  not_selected: "Not selected",
};
