import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { getSessionContext } from "@/lib/auth";
import { getCounties, getFullProfile } from "@/lib/data";
import { BasicsForm } from "./BasicsForm";
import {
  addEducationAction,
  addExperienceAction,
  addPortfolioAction,
  deleteEducationAction,
  deleteExperienceAction,
  deletePortfolioAction,
  saveSkillsAction,
  uploadPhotoAction,
} from "./actions";

export const metadata: Metadata = { title: "Edit profile" };

const fileInput =
  "block w-full rounded-md border border-control bg-surface text-body-sm file:mr-3 file:min-h-12 file:cursor-pointer file:border-0 file:bg-surface-sunken file:px-4 file:text-label";

function DeleteButton({ label }: { label: string }) {
  return (
    <button type="submit" className="min-h-12 cursor-pointer rounded-pill px-3 text-label text-danger hover:bg-danger-soft" aria-label={label}>
      Remove
    </button>
  );
}

export default async function EditProfilePage() {
  const ctx = await getSessionContext();
  if (!ctx?.activeProfile) redirect("/sign-in");

  const [profile, counties, skillsResult] = await Promise.all([
    getFullProfile(ctx.supabase, ctx.activeProfile.id),
    getCounties(ctx.supabase),
    ctx.supabase.from("skills").select("id, name, categories(name)").order("name"),
  ]);
  if (!profile) redirect("/onboarding");

  const isEmployer = profile.type === "employer";
  const mySkills = new Set(profile.skills.map((s) => s.id));

  // Group the skill list by category for easier scanning.
  const groups = new Map<string, Array<{ id: number; name: string }>>();
  for (const s of (skillsResult.data ?? []) as unknown as Array<{ id: number; name: string; categories: { name: string } | null }>) {
    const key = s.categories?.name ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), { id: s.id, name: s.name }]);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title-lg">Edit profile</h1>
        <Link href="/me" className={buttonClasses("secondary")}>
          Done
        </Link>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-title-md">The basics</h2>
        <BasicsForm profile={profile} counties={counties} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-title-md">{isEmployer ? "Logo or photo" : "Photo"}</h2>
        <p className="text-body-sm text-ink-muted">Optional. JPG, PNG or WebP, up to 1 MB.</p>
        <form action={uploadPhotoAction} className="flex flex-col gap-3">
          <label htmlFor="photo" className="text-label">
            Choose a photo
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className={fileInput} />
          <div>
            <Button type="submit" variant="secondary">
              Upload photo
            </Button>
          </div>
        </form>
      </Card>

      {!isEmployer && (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="text-title-md">Skills</h2>
            <p className="text-body-sm text-ink-muted">Tick up to 15 skills. Open a group to see its skills.</p>
            <form action={saveSkillsAction} className="flex flex-col gap-2">
              {[...groups.entries()].map(([category, skills]) => (
                <details key={category} open={skills.some((s) => mySkills.has(s.id))} className="rounded-md border border-line">
                  <summary className="flex min-h-12 cursor-pointer items-center px-4 text-label">{category}</summary>
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    {skills.map((s) => (
                      <label
                        key={s.id}
                        className="flex min-h-12 cursor-pointer items-center gap-2 rounded-pill border border-control px-4 text-body-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary"
                      >
                        <input type="checkbox" name="skill" value={s.id} defaultChecked={mySkills.has(s.id)} className="size-4 accent-primary" />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
              <div className="pt-2">
                <Button type="submit">Save skills</Button>
              </div>
            </form>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-title-md">Experience</h2>
            {profile.experiences.length > 0 && (
              <ul className="flex flex-col gap-2">
                {profile.experiences.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
                    <span>
                      <span className="block text-label">{e.title}</span>
                      <span className="block text-body-sm text-ink-muted">{e.organisation}</span>
                    </span>
                    <form action={deleteExperienceAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <DeleteButton label={`Remove ${e.title}`} />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addExperienceAction} className="flex flex-col gap-4">
              <h3 className="text-title-sm">Add a job you have done</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="exp-title" name="title" label="What you did" placeholder="Electrician" required />
                <TextField id="exp-org" name="organisation" label="Where (business or client)" placeholder="Mwangaza Electricals" />
                <TextField id="exp-town" name="town" label="Town" placeholder="Nakuru Town" />
                <div className="grid grid-cols-2 gap-4">
                  <TextField id="exp-start" name="start" label="From" type="month" />
                  <TextField id="exp-end" name="end" label="To" type="month" hint="Empty if still there." />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="exp-desc" className="text-label">
                  What the work involved (optional)
                </label>
                <textarea id="exp-desc" name="description" rows={3} maxLength={1000} className="w-full rounded-md border border-control bg-surface px-4 py-3 text-body" />
              </div>
              <div>
                <Button type="submit" variant="secondary">
                  Add experience
                </Button>
              </div>
            </form>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-title-md">Education and training</h2>
            {profile.education.length > 0 && (
              <ul className="flex flex-col gap-2">
                {profile.education.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
                    <span>
                      <span className="block text-label">{e.institution}</span>
                      <span className="block text-body-sm text-ink-muted">{[e.qualification, e.field].filter(Boolean).join(" · ")}</span>
                    </span>
                    <form action={deleteEducationAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <DeleteButton label={`Remove ${e.institution}`} />
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addEducationAction} className="flex flex-col gap-4">
              <h3 className="text-title-sm">Add a school, course or certificate</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField id="edu-kind" name="kind" label="Type" defaultValue="college" required>
                  <option value="secondary">Secondary school</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="certificate">Certificate</option>
                  <option value="trade_test">Trade test</option>
                </SelectField>
                <TextField id="edu-inst" name="institution" label="School or institution" placeholder="Rift Valley Technical Institute" required />
                <TextField id="edu-qual" name="qualification" label="Qualification" placeholder="Diploma, KCSE, Grade II" />
                <TextField id="edu-field" name="field" label="Course or subject" placeholder="Electrical Engineering" />
                <TextField id="edu-start" name="start_year" label="Year started" type="number" inputMode="numeric" min={1960} max={2100} />
                <TextField id="edu-end" name="end_year" label="Year finished" type="number" inputMode="numeric" min={1960} max={2100} hint="Empty if still studying." />
              </div>
              <div>
                <Button type="submit" variant="secondary">
                  Add education
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}

      {profile.type === "worker" && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-title-md">Work photos</h2>
          <p className="text-body-sm text-ink-muted">Optional. Show work you have done. JPG, PNG or WebP, up to 2 MB each.</p>
          {profile.portfolio.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.portfolio.map((item) => (
                <li key={item.id} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lazy-loaded; keeps the page light */}
                  <img src={item.url} alt={item.caption ?? "Work photo"} loading="lazy" className="aspect-square w-full rounded-md bg-surface-sunken object-cover" />
                  <form action={deletePortfolioAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <DeleteButton label="Remove this photo" />
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addPortfolioAction} className="flex flex-col gap-3">
            <label htmlFor="portfolio-image" className="text-label">
              Choose a photo
            </label>
            <input id="portfolio-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required className={fileInput} />
            <TextField id="portfolio-caption" name="caption" label="What it shows (optional)" placeholder="Solar installation in Njoro" maxLength={140} />
            <div>
              <Button type="submit" variant="secondary">
                Add photo
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
