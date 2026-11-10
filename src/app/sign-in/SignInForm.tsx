"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { formatKenyanPhone } from "@/lib/phone";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { view: "signin", phone: "" };

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  // The number is waiting for our team to confirm it.
  if (state.view === "waiting") {
    return (
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <h2 className="text-title-sm">We are confirming your number</h2>
        <p className="text-body-sm text-ink-muted" role="status">
          {state.notice ? `${state.notice} ` : ""}
          Before you can sign in, our team needs to confirm that{" "}
          <span className="text-label text-ink">{formatKenyanPhone(state.phone)}</span> is yours.
        </p>
        <p className="rounded-lg bg-primary-soft px-4 py-3 text-body-sm text-ink">
          <span className="text-label">What happens next:</span> we may call you on this number. This usually takes
          less than a day. After that, come back and sign in with your number and PIN.
        </p>
        <Button type="submit" name="intent" value="show-signin" variant="secondary" fullWidth disabled={pending}>
          Back to sign in
        </Button>
      </form>
    );
  }

  const joining = state.view === "join";
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h2 className="text-title-sm">{joining ? "Create your account" : "Sign in"}</h2>
      <TextField
        id="phone"
        name="phone"
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0712 345 678"
        required
      />
      <TextField
        id="pin"
        name="pin"
        label={joining ? "Choose a PIN" : "PIN"}
        type="password"
        autoComplete={joining ? "new-password" : "current-password"}
        minLength={6}
        hint={joining ? "At least 6 numbers or letters. You will use it every time you sign in." : undefined}
        required
      />
      <ErrorNote message={state.error} />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "One moment…" : joining ? "Create account" : "Sign in"}
      </Button>
      <Button
        type="submit"
        name="intent"
        value={joining ? "show-signin" : "show-join"}
        variant="ghost"
        disabled={pending}
      >
        {joining ? "I already have an account" : "New here? Create an account"}
      </Button>
    </form>
  );
}
