"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import type { Role } from "@/lib/types";
import { submitVerificationAction, type VerificationState } from "./actions";

const docOptions: Record<Role, Array<{ value: string; label: string; numberLabel: string }>> = {
  worker: [{ value: "national_id", label: "National ID", numberLabel: "ID number" }],
  intern: [
    { value: "national_id", label: "National ID", numberLabel: "ID number" },
    { value: "student_id", label: "Student ID", numberLabel: "Student or admission number" },
    { value: "institution_letter", label: "Letter from my institution", numberLabel: "Student or admission number" },
  ],
  employer: [
    { value: "business_registration", label: "Business registration certificate", numberLabel: "Registration number" },
    { value: "kra_pin", label: "KRA PIN certificate", numberLabel: "KRA PIN" },
  ],
};

export function VerificationForm({ role }: { role: Role }) {
  const [state, formAction, pending] = useActionState<VerificationState, FormData>(submitVerificationAction, {});
  const options = docOptions[role];
  const [docType, setDocType] = useState(options[0].value);
  const current = options.find((o) => o.value === docType) ?? options[0];
  const isEmployer = role === "employer";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <SelectField id="doc_type" name="doc_type" label="Document" value={docType} onChange={(e) => setDocType(e.target.value)} required>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>

      <TextField id="doc_number" name="doc_number" label={current.numberLabel} maxLength={40} required />

      {role === "intern" && docType !== "national_id" && (
        <TextField id="institution_name" name="institution_name" label="School or institution" placeholder="Kenya Coast National Polytechnic" required />
      )}

      {isEmployer && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="contact_person_name" name="contact_person_name" label="Contact person" autoComplete="name" required />
          <TextField id="contact_person_phone" name="contact_person_phone" label="Their phone number" type="tel" inputMode="tel" placeholder="0712 345 678" required />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="document" className="text-label">
          {isEmployer ? "Photo or PDF of the certificate (optional)" : "Clear photo of the document"}
        </label>
        <input
          id="document"
          name="document"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={!isEmployer}
          className="block w-full rounded-md border border-control bg-surface text-body-sm file:mr-3 file:min-h-12 file:cursor-pointer file:border-0 file:bg-surface-sunken file:px-4 file:text-label"
        />
        <p className="text-body-sm text-ink-muted">JPG, PNG, WebP or PDF, up to 5 MB. Only our review team can see it.</p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send for review"}
        </Button>
      </div>
    </form>
  );
}
