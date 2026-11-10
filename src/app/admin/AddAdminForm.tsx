"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { addAdminAction, type AddAdminState } from "./actions";

export function AddAdminForm() {
  const [state, formAction, pending] = useActionState<AddAdminState, FormData>(addAdminAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="admin-phone"
          name="phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0712 345 678"
          required
        />
        <TextField
          id="admin-pin"
          name="pin"
          label="Starting PIN (only for a new number)"
          type="password"
          autoComplete="new-password"
          minLength={6}
          hint="Leave empty if this number already has an account."
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="rounded-lg bg-primary-soft px-4 py-3 text-body-sm text-ink" role="status">
          {state.notice}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add admin"}
        </Button>
      </div>
    </form>
  );
}
