"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { m } from "motion/react";
import { Clock, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Honeypot, useHumanCheck } from "@/components/security/HumanCheck";
import { api, ApiError } from "@/lib/client";
import { suggestEmail } from "@/lib/emailTypo";

const ICONS = [MessageCircle, Clock, Mail];

/** Assisted assessment, step 1: email first (the report goes here), then the question cards. */
export function ChatStart({
  copy,
  consentText,
}: {
  copy: { title: string; body: string; facts: string[] };
  consentText: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const human = useHumanCheck("start");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  async function start(e?: React.FormEvent, override?: string, accept = false) {
    e?.preventDefault();
    const address = (override ?? email).trim();
    if (!/^\S+@\S+\.\S+$/.test(address))
      return setError("Please enter a valid email address.");
    const fix = suggestEmail(address);
    if (fix && !accept && confirmed !== address.toLowerCase()) {
      setSuggestion(fix);
      setError(null);
      return;
    }
    setSuggestion(null);
    if (!human.ready)
      return setError("Just a moment — we're checking you're human…");
    setBusy(true);
    setError(null);
    const utm = Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"]
        .map((k) => [k, params.get(`utm_${k}`) ?? undefined])
        .filter(([, v]) => v),
    );
    try {
      await api("/api/chat/start", {
        method: "POST",
        body: JSON.stringify({
          consent: true,
          email: address,
          utm,
          hp,
          human: human.token ?? undefined,
        }),
      });
      router.push("/q");
    } catch (err) {
      setBusy(false);
      human.reset();
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong mx-auto grid w-full max-w-5xl gap-8 rounded-[var(--radius-glass)] px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-14"
    >
      <div className="text-center lg:text-left">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sage to-cream shadow-inner lg:mx-0">
          <Sparkles className="h-6 w-6 text-forest" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-4xl leading-tight text-forest sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted lg:mx-0">
          {copy.body}
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
          {copy.facts.map((f, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <li
                key={f}
                className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-forest"
              >
                <Icon className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> {f}
              </li>
            );
          })}
        </ul>
      </div>

      <form
        onSubmit={start}
        className="rounded-3xl bg-white/55 p-5 shadow-[inset_0_0_0_1px_rgba(18,41,31,0.06)] sm:p-6"
        noValidate
      >
        <label htmlFor={emailId} className="text-sm font-medium text-forest">
          Your email
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-white/80 px-4 focus-within:border-teal">
          <Mail className="h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSuggestion(null);
              setError(null);
            }}
            placeholder="you@example.com"
            className="h-12 w-full bg-transparent text-base text-forest outline-none placeholder:text-muted/60"
          />
        </div>
        {suggestion && (
          <p className="mt-2 text-sm text-forest" role="status">
            Did you mean{" "}
            <button
              type="button"
              className="font-medium text-teal-deep underline underline-offset-4"
              onClick={() => {
                setEmail(suggestion);
                void start(undefined, suggestion, true);
              }}
            >
              {suggestion}
            </button>
            ?{" "}
            <button
              type="button"
              className="text-muted underline underline-offset-4"
              onClick={() => {
                setConfirmed(email.trim().toLowerCase());
                void start(undefined, email, true);
              }}
            >
              No, use what I typed
            </button>
          </p>
        )}

        <Honeypot value={hp} onChange={setHp} />
        <div className="mt-5 flex flex-col items-center gap-3">
          {human.widget}
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Start my assessment
          </Button>
          <p
            role="alert"
            aria-live="polite"
            className="min-h-5 text-center text-sm text-ember-deep"
          >
            {error}
          </p>
          <p className="max-w-md text-center text-xs leading-relaxed text-muted">
            {consentText}
          </p>
          <Link
            href="/"
            className="text-sm text-teal-deep underline-offset-4 hover:underline"
          >
            Prefer the standard assessment?
          </Link>
        </div>
      </form>
    </m.div>
  );
}
