import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { Icon, iconNames } from "@/components/ui/Icon";
import { StatusPill, TypeChip } from "@/components/ui/Pills";
import { RoleBadge, VerifiedSeal } from "@/components/ui/RoleBadge";
import { brand } from "@/lib/brand";
import { sampleJobs } from "@/lib/sample-data";
import { roleLabel, type ApplicationStatus, type Role } from "@/lib/types";

export const metadata: Metadata = { title: "Design system" };

const colours: Array<{ name: string; swatch: string; use: string }> = [
  { name: "bg", swatch: "bg-bg", use: "Page background" },
  { name: "surface", swatch: "bg-surface", use: "Cards, inputs" },
  { name: "surface-sunken", swatch: "bg-surface-sunken", use: "Quiet fills" },
  { name: "ink", swatch: "bg-ink", use: "Main text" },
  { name: "ink-muted", swatch: "bg-ink-muted", use: "Secondary text" },
  { name: "line", swatch: "bg-line", use: "Dividers" },
  { name: "control", swatch: "bg-control", use: "Input borders" },
  { name: "primary", swatch: "bg-primary", use: "Main action, links" },
  { name: "primary-strong", swatch: "bg-primary-strong", use: "Hover, pressed" },
  { name: "primary-soft", swatch: "bg-primary-soft", use: "Selected, Seen" },
  { name: "sprout", swatch: "bg-sprout", use: "Intern badge only" },
  { name: "sprout-ink", swatch: "bg-sprout-ink", use: "Intern label text" },
  { name: "amber", swatch: "bg-amber", use: "Accent, Worker badge" },
  { name: "amber-ink", swatch: "bg-amber-ink", use: "Amber-toned text" },
  { name: "amber-soft", swatch: "bg-amber-soft", use: "Shortlisted, tips" },
  { name: "danger", swatch: "bg-danger", use: "Errors, scam warnings" },
  { name: "danger-soft", swatch: "bg-danger-soft", use: "Error background" },
];

const typeStyles: Array<{ name: string; className: string; sample: string }> = [
  { name: "display · 32/40 · 800", className: "text-display", sample: "Verified jobs near you" },
  { name: "title-lg · 24/32 · 700", className: "text-title-lg", sample: "Jobs near Nakuru" },
  { name: "title-md · 20/28 · 700", className: "text-title-md", sample: "Electrician, wiring and solar" },
  { name: "title-sm · 17/24 · 600", className: "text-title-sm", sample: "ICT support attachment" },
  { name: "body · 16/24 · 400", className: "text-body", sample: "Find work near you and apply in one tap." },
  { name: "body-sm · 14/20 · 400", className: "text-body-sm", sample: "Nakuru Town, Nakuru · Closes 28 Nov" },
  { name: "label · 14/20 · 600", className: "text-label", sample: "Apply now" },
  { name: "caption · 12/16 · 600", className: "text-caption uppercase", sample: "Verified employer" },
];

const roles: Role[] = ["worker", "intern", "employer"];
const statuses: ApplicationStatus[] = ["sent", "seen", "shortlisted", "accepted", "not_selected"];

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-title-md">{title}</h2>
        {note && <p className="max-w-[65ch] text-body-sm text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-primary uppercase">{brand.name} design system</p>
        <h1 className="text-display">The building blocks</h1>
        <p className="max-w-[65ch] text-ink-muted">
          Every screen in the app is built from the colours, type, icons, badges and components on this page.
        </p>
      </header>

      <Section title="Colour" note="Deep green leads, amber is the accent, cream is the page. There is no blue.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {colours.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className={`h-14 border-b border-line ${c.swatch}`} />
              <div className="p-3">
                <p className="text-label">{c.name}</p>
                <p className="text-caption font-normal text-ink-muted">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type" note="Plus Jakarta Sans, four weights. Nothing smaller than 12px.">
        <Card className="flex flex-col gap-4">
          {typeStyles.map((t) => (
            <div key={t.name} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-6">
              <span className="w-48 shrink-0 text-caption font-normal text-ink-muted">{t.name}</span>
              <span className={t.className}>{t.sample}</span>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Icons" note="A rounded outline in the text colour with one small amber fill.">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {iconNames.map((name) => (
            <li key={name}>
              <Card className="flex flex-col items-center gap-2 px-2">
                <Icon name={name} size={28} />
                <span className="text-caption text-ink-muted">{name}</span>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Role badges" note="Each role has its own shape and colour. The seal is added when a profile is verified.">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {roles.map((role) => (
            <li key={role}>
              <Card className="flex flex-col items-center gap-3">
                <div className="flex items-end gap-4">
                  <RoleBadge role={role} size={64} />
                  <RoleBadge role={role} size={64} verified />
                  <RoleBadge role={role} size={24} verified />
                </div>
                <span className="text-label">{roleLabel[role]}</span>
              </Card>
            </li>
          ))}
          <li>
            <Card className="flex h-full flex-col items-center justify-between gap-3">
              <div className="flex items-end gap-4">
                <VerifiedSeal size={40} label="Verified" />
                <VerifiedSeal size={18} />
              </div>
              <span className="text-label">Verified seal</span>
            </Card>
          </li>
        </ul>
      </Section>

      <Section title="Buttons" note="One primary button per screen. Every button is at least 48px tall.">
        <div className="flex flex-wrap gap-3">
          <Button>Apply</Button>
          <Button variant="secondary">Save for later</Button>
          <Button variant="ghost">See all jobs</Button>
          <Button variant="danger">Close this post</Button>
          <Button disabled>Apply</Button>
        </div>
      </Section>

      <Section title="Form fields" note="Labels are always visible. Input text is 16px so phones do not zoom.">
        <Card className="grid gap-4 md:grid-cols-3">
          <TextField
            id="ds-phone"
            label="Phone number"
            type="tel"
            inputMode="tel"
            placeholder="0712 345 678"
            hint="We send a code to this number."
          />
          <SelectField id="ds-county" label="County" defaultValue="Nakuru">
            <option>Nairobi</option>
            <option>Mombasa</option>
            <option>Kisumu</option>
            <option>Nakuru</option>
            <option>Uasin Gishu</option>
          </SelectField>
          <TextField
            id="ds-code"
            label="Code from SMS"
            inputMode="numeric"
            defaultValue="12"
            error="Enter all 6 digits of the code."
          />
        </Card>
      </Section>

      <Section title="Status and type" note="Status always shows the word. “Not selected” is quiet on purpose.">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <TypeChip type="job" />
          <TypeChip type="internship" />
          <TypeChip type="attachment" />
        </div>
      </Section>

      <Section title="Job cards" note="One post in a list. After applying, the button becomes the status.">
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          {sampleJobs.map((job, i) => (
            <JobCard key={job.id} job={job} action={i === 1 ? <StatusPill status="seen" /> : <Button>Apply</Button>} />
          ))}
        </div>
      </Section>
    </main>
  );
}
