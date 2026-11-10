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

  // Step 2: the number needs confirming, by SMS code or by our team.
  if (state.view === "confirm") {
    return (
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <h2 className="text-title-sm">Confirm your number</h2>
        <p className="text-body-sm text-ink-muted" role="status">
          {state.notice ? `${state.notice} ` : ""}
          Before you can sign in, we need to confirm that{" "}
          <span className="text-label text-ink">{formatKenyanPhone(state.phone)}</span> is yours.
        </p>
        <ErrorNote message={state.error} />
        <Button type="submit" name="intent" value="send-code" fullWidth disabled={pending}>
          {pending ? "Sending code…" : "Send me a code by SMS"}
        </Button>
        <p className="rounded-lg bg-primary-soft px-4 py-3 text-body-sm text-ink">
          <span className="text-label">No SMS? No problem.</span> Our team also confirms new numbers, usually within a
          day. After that, sign in with your number and PIN.
        </p>
        <Button type="submit" name="intent" value="show-signin" variant="ghost" disabled={pending}>
          Back to sign in
        </Button>
      </form>
    );
  }

  // Step 3 (SMS route): enter the code.
  if (state.view === "code") {
    return (
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <p className="text-body-sm text-ink-muted" role="status">
          We sent a code to <span className="text-label text-ink">{formatKenyanPhone(state.phone)}</span>
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
          <Button type="submit" name="intent" value="send-code" variant="ghost" disabled={pending}>
            Send a new code
          </Button>
          <Button type="submit" name="intent" value="show-signin" variant="ghost" disabled={pending}>
            Back to sign in
          </Button>
        </div>
      </form>
    );
  }

  // Step 1: sign in, or join.
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
