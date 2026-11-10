"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import type { FullProfile, Option } from "@/lib/data";
import { saveBasicsAction, type BasicsState } from "./actions";

export function BasicsForm({ profile, counties }: { profile: FullProfile; counties: Option[] }) {
  const [state, formAction, pending] = useActionState<BasicsState, FormData>(saveBasicsAction, {});
  const isEmployer = profile.type === "employer";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField id="full_name" name="full_name" label="Your full name" defaultValue={profile.fullName} autoComplete="name" required />
      {isEmployer && (
        <>
          <TextField id="business_name" name="business_name" label="Business name" defaultValue={profile.businessName ?? ""} required />
          <TextField id="sector" name="sector" label="What the business does" defaultValue={profile.sector ?? ""} placeholder="Electrical and solar installation" />
        </>
      )}
      <TextField
        id="headline"
        name="headline"
        label={isEmployer ? "One line about the business" : "One line about you"}
        defaultValue={profile.headline ?? ""}
        placeholder={isEmployer ? "Family-run hardware shop since 2012" : "Electrician with 4 years of experience"}
        maxLength={120}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-label">
          {isEmployer ? "About the business" : "About you"}
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={1000}
          defaultValue={profile.bio ?? ""}
          className="w-full rounded-md border border-control bg-surface px-4 py-3 text-body placeholder:text-ink-muted"
          placeholder={isEmployer ? "What you do and who you like to hire." : "What you are good at and the work you are looking for."}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="county_id" name="county_id" label="County" defaultValue={profile.countyId ?? ""} required>
          <option value="" disabled>
            Choose your county
          </option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField id="town" name="town" label="Town or area" defaultValue={profile.town ?? ""} placeholder="Nakuru Town" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-lg bg-primary-soft px-4 py-3 text-body-sm text-ink" role="status">
          Saved.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
