"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { Check, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Honeypot, useHumanCheck } from "@/components/security/HumanCheck";
import { api, ApiError } from "@/lib/client";
import { suggestEmail } from "@/lib/emailTypo";

/**
 * Email gate: the result unlocks as soon as a valid email is entered, then a
 * short staged loader plays while we hand over to the result page. The
 * loader runs for a minimum time so it reads as a deliberate moment, not a flash.
 */
export function EmailGate({
  teaser,
  loaderSteps,
  knownEmail,
}: {
  teaser: { count: number; names: string[] };
  loaderSteps: { title: string; body: string }[];
  /** Assisted assessment: the email was given up front (masked here) — no form, just "See my report". */
  knownEmail?: string;
}) {
  const router = useRouter();
  const emailId = useId();
  const optId = useId();
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const human = useHumanCheck("unlock");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // "Did you mean …?" for obvious domain typos — asked once per typed address.
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  async function submit(e?: React.FormEvent, override?: string, accept = false) {
    e?.preventDefault();
    if (knownEmail) return finish();
    const address = (override ?? email).trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Please enter a valid email address.");
      return;
    }
    const fix = suggestEmail(address);
    if (fix && !accept && confirmed !== address.toLowerCase()) {
      setSuggestion(fix);
      setError(null);
      return;
    }
    setSuggestion(null);
    if (!human.ready) {
      setError("Just a moment — we're checking you're human…");
      return;
    }
    setBusy(true);
    setError(null);
    setLoading(true);
    const minimum = new Promise((r) => setTimeout(r, 1500));
    try {
      const [{ token }] = await Promise.all([
        api<{ token: string }>("/api/unlock", { method: "POST", body: JSON.stringify({ email: address, newsletter, hp, human: human.token ?? undefined }) }),
        minimum,
      ]);
      router.push(`/result/${token}`);
    } catch (err) {
      human.reset();
      setLoading(false);
      setBusy(false);
      if (err instanceof ApiError && err.code === "NO_SESSION") router.replace("/");
      else setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  /** Assisted: create the report and email it to the address given at the start. */
  async function finish() {
    setBusy(true);
    setError(null);
    setLoading(true);
    const minimum = new Promise((r) => setTimeout(r, 1500));
    try {
      const [{ token }] = await Promise.all([api<{ token: string }>("/api/chat/finish", { method: "POST" }), minimum]);
      router.push(`/result/${token}`);
    } catch (err) {
      setLoading(false);
      setBusy(false);
      if (err instanceof ApiError && err.code === "NO_SESSION") router.replace("/");
      else setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <div className="glass-strong rounded-[var(--radius-glass)] px-6 py-10 text-center sm:px-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage">
          <Sparkles className="h-5 w-5 text-forest" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-3xl leading-tight text-forest sm:text-4xl">
          We found {teaser.count} focus area{teaser.count === 1 ? "" : "s"} for you
        </h2>
        <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Your focus areas">
          {teaser.names.map((n, i) => (
            <m.li
              key={n}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-forest"
            >
              {n}
            </m.li>
          ))}
        </ul>
        <p className="mx-auto mt-5 max-w-sm text-[15px] text-muted">
          {knownEmail
            ? `Your full report shows which COMPLETE+ ingredients support each area and why. We’ll also send a copy to ${knownEmail}.`
            : "Enter your email to open your full report — which COMPLETE+ ingredients support each area, your safety check, and how one serve compares with your daily needs. We’ll email you a copy too."}
        </p>

        {knownEmail ? (
          <div className="mx-auto mt-7 max-w-sm">
            <Button size="lg" loading={busy} className="w-full" onClick={() => void finish()}>
              See my report
            </Button>
            <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-center text-sm text-ember-deep">
              {error}
            </p>
          </div>
        ) : (
        <form onSubmit={submit} className="mx-auto mt-7 max-w-sm text-left" noValidate>
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <div className="glass flex items-center gap-3 rounded-2xl px-4">
            <Mail className="h-4 w-4 shrink-0 text-teal" aria-hidden />
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSuggestion(null);
              }}
              placeholder="you@example.com"
              // 16px+ so iPhones don't zoom into the page when the field is tapped.
              className="h-14 w-full bg-transparent text-base text-forest outline-none placeholder:text-muted/50"
            />
          </div>
          {suggestion && (
            <div role="status" className="mt-3 rounded-2xl bg-[#fdf0e3] p-3 text-sm text-[#7a4a12]">
              Did you mean <strong>{suggestion}</strong>?
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-forest px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => {
                    setEmail(suggestion);
                    setConfirmed(suggestion.toLowerCase());
                    void submit(undefined, suggestion, true);
                  }}
                >
                  Yes, use {suggestion}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#e8c9a3] px-3 py-1.5 text-xs text-[#7a4a12]"
                  onClick={() => {
                    const typed = email.trim();
                    setConfirmed(typed.toLowerCase());
                    void submit(undefined, typed, true);
                  }}
                >
                  No, keep {email.trim()}
                </button>
              </div>
            </div>
          )}

          <label htmlFor={optId} className="mt-4 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-muted">
            <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <input
                id={optId}
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="peer h-5 w-5 appearance-none rounded-md border border-line bg-white checked:border-forest checked:bg-forest"
              />
              <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" aria-hidden />
            </span>
            Send me occasional tips and offers from FUYL. (Optional — unsubscribe anytime.)
          </label>

          <Honeypot value={hp} onChange={setHp} />
          <div className="mt-4">{human.widget}</div>
          <Button type="submit" size="lg" loading={busy} className="mt-6 w-full">
            See my report
          </Button>
          <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-center text-sm text-ember-deep">
            {error}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
            <Lock className="h-3 w-3" aria-hidden /> Your answers are private and never sold.
          </p>
        </form>
        )}
      </div>

      {/* Portalled to <body>: an animated (transformed) ancestor would otherwise
          make `position: fixed` relative to the card instead of the viewport. */}
      {typeof document !== "undefined" &&
        createPortal(<AnimatePresence>{loading && <Loader steps={loaderSteps} />}</AnimatePresence>, document.body)}
    </>
  );
}

function Loader({ steps }: { steps: { title: string; body: string }[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 420);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-mist/85 px-6 backdrop-blur-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto h-28 w-28">
          <m.span
            className="absolute inset-0 rounded-full border-2 border-teal/30"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <m.span
            className="absolute inset-3 rounded-full border-2 border-transparent border-t-forest border-r-teal"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
          <span className="glass absolute inset-7 rounded-full" />
        </div>
        <div className="relative mt-10 h-24">
          <AnimatePresence mode="wait">
            <m.div
              key={i}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
              transition={{ duration: 0.45 }}
              className="absolute inset-x-0"
            >
              <p className="font-display text-3xl text-forest">{steps[i].title}</p>
              <p className="mt-2 text-sm text-muted">{steps[i].body}</p>
            </m.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all duration-500 ${k <= i ? "w-6 bg-forest" : "w-1.5 bg-forest/20"}`} />
          ))}
        </div>
      </div>
    </m.div>
  );
}
