import type { JobSummary } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Join class names, skipping empty values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 35000 -> "KES 35,000" */
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

/** "KES 35,000 – 45,000 a month", "Stipend KES 8,000 a month", or "Pay not stated". */
export function formatPay(job: Pick<JobSummary, "type" | "payMin" | "payMax" | "payPeriod">): string {
  const { payMin, payMax, payPeriod = "month" } = job;
  if (payMin == null && payMax == null) return "Pay not stated";
  const low = payMin ?? payMax!;
  const high = payMax ?? payMin!;
  const range = low === high ? formatKES(low) : `${formatKES(low)} – ${high.toLocaleString("en-KE")}`;
  const prefix = job.type === "job" ? "" : "Stipend ";
  return `${prefix}${range} a ${payPeriod}`;
}

/** "2026-11-28" -> "28 Nov". Parsed by hand so the result never shifts with time zone. */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
