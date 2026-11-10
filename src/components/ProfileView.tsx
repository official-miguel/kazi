import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { RoleBadge } from "@/components/ui/RoleBadge";
import type { FullProfile } from "@/lib/data";
import { roleLabel } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const educationKind: Record<string, string> = {
  secondary: "Secondary school",
  college: "College",
  university: "University",
  certificate: "Certificate",
  trade_test: "Trade test",
};

function monthYear(date: string | null): string | null {
  if (!date) return null;
  const [year, month] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-title-md">{title}</h2>
      {children}
    </Card>
  );
}

interface ProfileViewProps {
  profile: FullProfile;
  /** Buttons shown in the header, e.g. "Edit profile". */
  actions?: ReactNode;
  /** When the owner is looking, empty sections show a prompt to fill them in. */
  own?: boolean;
}

/** A profile laid out as a CV: header, about, skills, experience, education, work photos. */
export function ProfileView({ profile, actions, own = false }: ProfileViewProps) {
  const isEmployer = profile.type === "employer";
  const place = [profile.town, profile.countyName].filter(Boolean).join(", ");
  const displayName = isEmployer && profile.businessName ? profile.businessName : profile.fullName;

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small, lazy-loaded photo; keeps the page light
            <img
              src={profile.photoUrl}
              alt=""
              width={88}
              height={88}
              loading="lazy"
              className="size-22 rounded-pill bg-surface-sunken object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-22 items-center justify-center rounded-pill bg-surface-sunken text-display text-ink-muted"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-title-lg">{displayName}</h1>
              <RoleBadge role={profile.type} verified={profile.verified} size={32} />
            </div>
            <p className="text-body-sm text-ink-muted">
              {roleLabel[profile.type]}
              {profile.verified ? " · Verified" : ""}
              {isEmployer && profile.businessName ? ` · Contact: ${profile.fullName}` : ""}
            </p>
            {(profile.headline || (isEmployer && profile.sector)) && (
              <p className="text-title-sm font-normal">{profile.headline ?? profile.sector}</p>
            )}
            {place && (
              <p className="flex items-center gap-1 text-body-sm text-ink-muted">
                <Icon name="location" size={20} />
                {place}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </Card>

      {(profile.bio || own) && (
        <Section title={isEmployer ? "About the business" : "About"}>
          {profile.bio ? (
            <p className="max-w-[65ch] whitespace-pre-line">{profile.bio}</p>
          ) : (
            <p className="text-ink-muted">Add a short description so people know who you are.</p>
          )}
        </Section>
      )}

      {!isEmployer && (profile.skills.length > 0 || own) && (
        <Section title="Skills">
          {profile.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li key={s.id} className="rounded-pill bg-primary-soft px-3 py-1.5 text-label text-primary">
                  {s.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">Add your skills so the right jobs find you.</p>
          )}
        </Section>
      )}

      {!isEmployer && (profile.experiences.length > 0 || own) && (
        <Section title="Experience">
          {profile.experiences.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {profile.experiences.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-4">
                  <p className="text-title-sm">{e.title}</p>
                  <p className="text-body-sm">{[e.organisation, e.town].filter(Boolean).join(" · ")}</p>
                  <p className="text-body-sm text-ink-muted">
                    {monthYear(e.start_date) ?? "Start not given"} – {monthYear(e.end_date) ?? "Now"}
                  </p>
                  {e.description && <p className="mt-1 max-w-[65ch] text-body-sm whitespace-pre-line">{e.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">Add jobs you have done, including casual and informal work.</p>
          )}
        </Section>
      )}

      {!isEmployer && (profile.education.length > 0 || own) && (
        <Section title="Education and training">
          {profile.education.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {profile.education.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-4">
                  <p className="text-title-sm">{e.institution}</p>
                  <p className="text-body-sm">
                    {[educationKind[e.kind] ?? e.kind, e.qualification, e.field].filter(Boolean).join(" · ")}
                  </p>
                  {(e.start_year || e.end_year) && (
                    <p className="text-body-sm text-ink-muted">
                      {e.start_year ?? "…"} – {e.end_year ?? "Now"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">Add your school, college, certificates or trade tests.</p>
          )}
        </Section>
      )}

      {profile.type === "worker" && (profile.portfolio.length > 0 || own) && (
        <Section title="Work photos">
          {profile.portfolio.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.portfolio.map((item) => (
                <li key={item.id}>
                  <figure className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- lazy-loaded; keeps the page light */}
                    <img
                      src={item.url}
                      alt={item.caption ?? "Work photo"}
                      loading="lazy"
                      className="aspect-square w-full rounded-md bg-surface-sunken object-cover"
                    />
                    {item.caption && <figcaption className="text-body-sm text-ink-muted">{item.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">Add photos of work you have done. They help employers trust your skill.</p>
          )}
        </Section>
      )}
    </>
  );
}
