"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { m } from "motion/react";
import { BadgeCheck, Check, Clock, MessageCircle, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, ApiError, type StateResponse } from "@/lib/client";

const ICONS = [Clock, MessageCircle, FileText];

export function Welcome({
  copy,
  consentText,
  disclaimer,
  trust = [],
  assisted = false,
}: {
  copy: { eyebrow: string; title: string; body: string; facts: string[] };
  consentText: string;
  disclaimer: string;
  trust?: string[];
  /** Offer the Assisted (chat) assessment next to the standard one. */
  assisted?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<null | "standard" | "assisted">(null);

  // Offer to resume an unfinished assessment in this browser.
  useEffect(() => {
    api<StateResponse>("/api/session")
      .then((r) => {
        if (r.mode === "assisted" && r.state) setResume("assisted");
        else if (r.state && r.state.path.length > 0) setResume("standard");
      })
      .catch(() => {});
  }, []);

  async function start() {
    if (!consent) {
      setError("Please tick the box to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    const utm = Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"]
        .map((k) => [k, params.get(`utm_${k}`) ?? undefined])
        .filter(([, v]) => v),
    );
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ consent: true, utm }) });
      router.push("/q");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const words = copy.title.split(" ");

  return (
    <div className="glass-strong mx-auto w-full max-w-xl rounded-[var(--radius-glass)] px-6 py-10 sm:px-12 sm:py-14">
      <m.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center text-xs font-medium uppercase tracking-[0.22em] text-teal-deep"
      >
        {copy.eyebrow}
      </m.p>

      <h1 className="mt-5 text-center font-display text-[2.6rem] leading-[1.05] text-forest sm:text-6xl">
        {words.map((w, i) => (
          <span
            key={i}
            // Pure-CSS word reveal: starts with the first paint instead of waiting
            // for JavaScript, so the headline counts as visible immediately.
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            className={`word-in inline-block ${w === "FUYL" ? "italic text-teal" : ""}`}
          >
            {w}&nbsp;
          </span>
        ))}
      </h1>

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mx-auto mt-5 max-w-md text-center text-[15px] leading-relaxed text-muted"
      >
        {copy.body}
      </m.p>

      <m.ul
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {copy.facts.map((f, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <m.li
              key={f}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-forest"
            >
              <Icon className="h-3.5 w-3.5 text-teal" aria-hidden /> {f}
            </m.li>
          );
        })}
      </m.ul>

      <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="mt-10">
        <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/50 p-4 text-left">
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
          <div className={assisted ? "grid w-full gap-3 sm:grid-cols-2" : "contents"}>
            <Button size="lg" onClick={start} loading={loading} className={assisted ? "w-full" : "w-full sm:w-auto"}>
              Start the assessment
            </Button>
            {assisted && (
              <Button size="lg" variant="glass" onClick={() => router.push("/chat")} className="w-full">
                <Sparkles className="h-4 w-4 text-teal-deep" aria-hidden /> Chat with an advisor
              </Button>
            )}
          </div>
          {assisted && (
            <p className="text-center text-xs text-muted">
              Standard: tap through one question at a time. Assisted: answer in your own words, like a chat.
            </p>
          )}
          {resume && (
            <button
              onClick={() => router.push(resume === "assisted" ? "/chat" : "/q")}
              className="text-sm text-teal-deep underline-offset-4 hover:underline"
            >
              {resume === "assisted" ? "Continue your chat" : "Continue where you left off"}
            </button>
          )}
          <p role="alert" aria-live="polite" className="min-h-5 text-sm text-ember-deep">
            {error}
          </p>
        </div>
      </m.div>

      <ul className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-line/50 pt-6 text-xs text-muted" aria-label="Product quality">
        {trust.map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">{disclaimer}</p>
    </div>
  );
}
