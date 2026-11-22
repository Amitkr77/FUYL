"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { m } from "motion/react";
import { Check, Clock, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ChatView } from "@/chat/types";
import { api, ApiError } from "@/lib/client";
import { suggestEmail } from "@/lib/emailTypo";

const ICONS = [MessageCircle, Clock, Mail];

/** Assisted assessment, step 1: email first (the report goes here), then the chat opens. */
export function ChatStart({
  copy,
  consentText,
  onStarted,
}: {
  copy: { title: string; body: string; facts: string[] };
  consentText: string;
  onStarted: (chat: ChatView) => void;
}) {
  const params = useSearchParams();
  const emailId = useId();
  const consentId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  async function start(e?: React.FormEvent, override?: string, accept = false) {
    e?.preventDefault();
    const address = (override ?? email).trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Please enter a valid email address.");
    if (!consent) return setError("Please tick the box to continue.");
    const fix = suggestEmail(address);
    if (fix && !accept && confirmed !== address.toLowerCase()) {
      setSuggestion(fix);
      setError(null);
      return;
    }
    setSuggestion(null);
    setBusy(true);
    setError(null);
    const utm = Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"].map((k) => [k, params.get(`utm_${k}`) ?? undefined]).filter(([, v]) => v),
    );
    try {
      const { chat } = await api<{ chat: ChatView }>("/api/chat/start", {
        method: "POST",
        body: JSON.stringify({ consent: true, email: address, utm }),
      });
      onStarted(chat);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong mx-auto w-full max-w-xl rounded-[var(--radius-glass)] px-6 py-10 sm:px-12 sm:py-12"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sage to-cream shadow-inner">
        <Sparkles className="h-6 w-6 text-forest" aria-hidden />
      </div>
      <h1 className="mt-5 text-center font-display text-4xl leading-tight text-forest sm:text-5xl">{copy.title}</h1>
      <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-relaxed text-muted">{copy.body}</p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {copy.facts.map((f, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={f} className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-forest">
              <Icon className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> {f}
            </li>
          );
        })}
      </ul>

      <form onSubmit={start} className="mt-8" noValidate>
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

        <label htmlFor={consentId} className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/50 p-4 text-left">
          <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="peer h-5 w-5 appearance-none rounded-md border border-line bg-white checked:border-forest checked:bg-forest"
            />
            <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" aria-hidden />
          </span>
          <span className="text-[13px] leading-relaxed text-muted">{consentText}</span>
        </label>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
            Start my assessment
          </Button>
          <p role="alert" aria-live="polite" className="min-h-5 text-center text-sm text-ember-deep">
            {error}
          </p>
          <Link href="/" className="text-sm text-teal-deep underline-offset-4 hover:underline">
            Prefer the standard assessment?
          </Link>
        </div>
      </form>
    </m.div>
  );
}
