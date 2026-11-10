"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { formatKenyanPhone } from "@/lib/phone";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { step: "phone", phone: "" };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  if (state.step === "phone") {
    return (
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <TextField
          id="phone"
          name="phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          hint="We will send a 6-digit code to this number by SMS."
          error={state.error}
          required
          autoFocus
        />
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Sending code…" : "Send me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <p className="text-body-sm text-ink-muted" role="status">
        {state.notice ?? "We sent a code to"} <span className="text-label text-ink">{formatKenyanPhone(state.phone)}</span>
      </p>
      <TextField
        id="code"
        name="code"
        label="Code from SMS"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        error={state.error}
        required
        autoFocus
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="submit" name="intent" value="resend" variant="ghost" disabled={pending} formNoValidate>
          Send a new code
        </Button>
        <Button type="submit" name="intent" value="change" variant="ghost" disabled={pending} formNoValidate>
          Change number
        </Button>
      </div>
    </form>
  );
}
