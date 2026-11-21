"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { loginAction, requestOtpAction, verifyOtpAction } from "@/app/admin/actions";
import { Field, btn, inputCls } from "./ui";

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
}

/**
 * Admin sign-in. Real accounts use an emailed one-time code (email → code).
 * In demo mode only, the demo buttons switch to password sign-in and fill in
 * the demo credentials.
 */
export function LoginForm({ demo = [] }: { demo?: DemoAccount[] }) {
  // Picking a demo account switches to password sign-in with its credentials filled in.
  const [picked, setPicked] = useState<DemoAccount | null>(null);
  return (
    <div className="mt-8 space-y-5">
      {demo.length > 0 && <DemoButtons demo={demo} onPick={setPicked} />}
      {picked ? <PasswordForm key={picked.email} account={picked} onBack={() => setPicked(null)} /> : <OtpForm />}
    </div>
  );
}

// ─── Email code (real accounts) ─────────────────────────────────────────────

function OtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await requestOtpAction(email);
      if (!r.ok) {
        setError(r.error);
        if (r.retryAfter) setCooldown(r.retryAfter);
        return;
      }
      setStep("code");
      setCooldown(60);
      setInfo(`If ${email.trim()} has admin access, a 6-digit code is on its way. It expires in 10 minutes.`);
      setTimeout(() => codeRef.current?.focus(), 50);
    });

  const verify = () =>
    start(async () => {
      setError(null);
      const r = await verifyOtpAction(email, code);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.replace("/admin");
      router.refresh();
    });

  return step === "email" ? (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <Field label="Work email">
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-[#a3301e]">
        {error}
      </p>
      <button type="submit" disabled={pending || !email} className={`${btn("primary")} w-full`}>
        <Mail className="h-4 w-4" aria-hidden /> {pending ? "Sending…" : "Email me a sign-in code"}
      </button>
    </form>
  ) : (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
    >
      <p className="rounded-xl bg-sage/50 px-3 py-2 text-xs text-forest">{info}</p>
      <Field label="6-digit code">
        <input
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          className={`${inputCls} text-center font-mono text-xl tracking-[0.35em]`}
        />
      </Field>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-[#a3301e]">
        {error}
      </p>
      <button type="submit" disabled={pending || code.replace(/\s/g, "").length !== 6} className={`${btn("primary")} w-full`}>
        {pending ? "Checking…" : "Sign in"}
      </button>
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="text-teal-deep hover:underline"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </button>
        <button type="button" disabled={cooldown > 0 || pending} onClick={send} className="text-teal-deep hover:underline disabled:text-muted disabled:no-underline">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// ─── Demo mode only ─────────────────────────────────────────────────────────

function DemoButtons({ demo, onPick }: { demo: DemoAccount[]; onPick: (d: DemoAccount) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {demo.map((d, i) => {
        const Icon = i === 0 ? ShieldCheck : UserRound;
        return (
          <button
            key={d.email}
            type="button"
            onClick={() => onPick(d)}
            className={`${btn("secondary", "sm")} h-auto flex-col gap-0.5 py-2`}
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Icon className="h-3.5 w-3.5" aria-hidden /> {d.label}
            </span>
            <span className="text-[10px] font-normal text-muted">Fill in credentials</span>
          </button>
        );
      })}
    </div>
  );
}

function PasswordForm({ account, onBack }: { account: DemoAccount; onBack: () => void }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState(account.password);

  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </Field>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-[#a3301e]">
        {state?.error}
      </p>
      <button type="submit" disabled={pending} className={`${btn("primary")} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <button type="button" onClick={onBack} className="w-full text-center text-xs text-teal-deep hover:underline">
        Sign in with an email code instead
      </button>
    </form>
  );
}
