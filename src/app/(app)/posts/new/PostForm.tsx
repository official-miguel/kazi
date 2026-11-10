"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import type { Option } from "@/lib/data";
import { createPostAction, type PostState } from "../actions";

interface PostFormProps {
  counties: Option[];
  categories: Option[];
  defaultCountyId: number | null;
  defaultTown: string | null;
  minDate: string;
}

const textarea = "w-full rounded-md border border-control bg-surface px-4 py-3 text-body placeholder:text-ink-muted";

export function PostForm({ counties, categories, defaultCountyId, defaultTown, minDate }: PostFormProps) {
  const [state, formAction, pending] = useActionState<PostState, FormData>(createPostAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField id="title" name="title" label="Job title" placeholder="Electrician, wiring and solar" maxLength={100} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="type" name="type" label="Type" defaultValue="job" required>
          <option value="job">Job</option>
          <option value="internship">Internship</option>
          <option value="attachment">Attachment</option>
        </SelectField>
        <SelectField id="category_id" name="category_id" label="Category" defaultValue="">
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="county_id" name="county_id" label="County" defaultValue={defaultCountyId ?? ""} required>
          <option value="" disabled>
            Choose the county
          </option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField id="town" name="town" label="Town or area" defaultValue={defaultTown ?? ""} placeholder="Nakuru Town" />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-label">Pay or stipend in KES (optional, but posts with pay get more applicants)</legend>
        <TextField id="pay_min" name="pay_min" label="From" inputMode="numeric" placeholder="35000" />
        <TextField id="pay_max" name="pay_max" label="To" inputMode="numeric" placeholder="45000" />
        <SelectField id="pay_period" name="pay_period" label="Paid every" defaultValue="month">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </SelectField>
      </fieldset>

      <TextField id="deadline" name="deadline" label="Closing date" type="date" min={minDate} required />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-label">
          About the work (optional)
        </label>
        <textarea id="description" name="description" rows={4} maxLength={3000} className={textarea} placeholder="What the person will do day to day." />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="requirements" className="text-label">
          What the person needs (optional)
        </label>
        <textarea id="requirements" name="requirements" rows={3} maxLength={2000} className={textarea} placeholder="Skills, certificates, tools, experience." />
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
