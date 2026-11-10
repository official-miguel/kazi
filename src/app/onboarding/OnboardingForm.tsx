"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { roleLabel, type Role } from "@/lib/types";
import { createProfileAction, type OnboardingState } from "./actions";

const roleHelp: Record<Role, string> = {
  worker: "I am looking for a job: skilled, casual or professional.",
  intern: "I am a student or graduate looking for an internship or attachment.",
  employer: "I want to hire for my business or my home.",
};

const allRoles: Role[] = ["worker", "intern", "employer"];

interface OnboardingFormProps {
  counties: Array<{ id: number; name: string }>;
  /** Roles this person already has. They cannot be chosen again. */
  takenRoles: Role[];
}

export function OnboardingForm({ counties, takenRoles }: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createProfileAction, {});
  const available = allRoles.filter((r) => !takenRoles.includes(r));
  const [role, setRole] = useState<Role | "">(available.length === 1 ? available[0] : "");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-title-sm">How do you want to use the app?</legend>
        {available.map((r) => (
          <label
            key={r}
            className="flex min-h-12 cursor-pointer items-center gap-4 rounded-lg border border-control bg-surface p-4 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="role"
              value={r}
              checked={role === r}
              onChange={() => setRole(r)}
              className="sr-only"
              required
            />
            <RoleBadge role={r} size={48} />
            <span className="flex flex-col">
              <span className="text-title-sm">{roleLabel[r]}</span>
              <span className="text-body-sm text-ink-muted">{roleHelp[r]}</span>
            </span>
          </label>
        ))}
        {errors.role && <p className="text-body-sm text-danger">{errors.role}</p>}
        <p className="text-body-sm text-ink-muted">You can add another profile later and switch between them.</p>
      </fieldset>

      <div className="flex flex-col gap-4">
        <TextField
          id="full_name"
          name="full_name"
          label="Your full name"
          autoComplete="name"
          placeholder="Wanjiru Kamau"
          error={errors.full_name}
          required
        />
        {role === "employer" && (
          <>
            <TextField
              id="business_name"
              name="business_name"
              label="Business name"
              autoComplete="organization"
              placeholder="Mwangaza Electricals"
              hint="Hiring for your home? Use your own name."
              error={errors.business_name}
              required
            />
            <TextField
              id="sector"
              name="sector"
              label="What the business does (optional)"
              placeholder="Electrical and solar installation"
            />
          </>
        )}
        <SelectField id="county_id" name="county_id" label="County" defaultValue="" error={errors.county_id} required>
          <option value="" disabled>
            Choose your county
          </option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField id="town" name="town" label="Town or area (optional)" placeholder="Nakuru Town" />
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Create my profile"}
      </Button>
    </form>
  );
}
