"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { Field, btn, inputCls } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required className={inputCls} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-[#a3301e]">
        {state?.error}
      </p>
      <button type="submit" disabled={pending} className={`${btn("primary")} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
