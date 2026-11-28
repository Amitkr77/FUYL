"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowRight, BadgeCheck, Clock, Mail, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Honeypot, useHumanCheck } from "@/components/security/HumanCheck";
import { api, ApiError, type StateResponse } from "@/lib/client";

const ICONS = [Clock, Target, Mail];

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
  const [loading, setLoading] = useState<null | "standard">(null);
  const [error, setError] = useState<string | null>(null);
  const human = useHumanCheck("start");
  const [hp, setHp] = useState("");
  // An unfinished assessment in this browser: how far along it is, so "Welcome back" can say so.
  const [resume, setResume] = useState<null | { percent: number; done: boolean }>(null);
  const expiredLink = params.get("resume") === "expired";

  useEffect(() => {
    api<StateResponse>("/api/session")
      .then((r) => {
        if (!r.state || (r.state.path.length === 0 && r.mode !== "assisted")) return;
        const v = r.state.view;
        setResume({ percent: v.kind === "question" ? Math.round(v.progress * 100) : 100, done: v.kind === "complete" });
      })
      .catch(() => {});
  }, []);

  /** Starting = agreeing to the consent text shown under the buttons. (Assisted starts on its own email screen.) */
  async function start(mode: "standard") {
    if (loading) return;
    if (!human.ready) {
      setError("Just a moment — we're checking you're human…");
      return;
    }
    setLoading(mode);
    setError(null);
    const utm = Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"]
        .map((k) => [k, params.get(`utm_${k}`) ?? undefined])
        .filter(([, v]) => v),
    );
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ consent: true, utm, hp, human: human.token ?? undefined }) });
      router.push("/q");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
      setLoading(null);
      human.reset();
    }
  }

  const words = copy.title.split(" ");

  return (
    <div className="glass-strong mx-auto w-full max-w-5xl rounded-[var(--radius-glass)] px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
      {resume && (
        <m.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-3 rounded-2xl bg-sage/60 p-5 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <p className="font-medium text-forest">Welcome back! Your answers are saved.</p>
            <p className="mt-0.5 text-sm text-muted">
              {resume.done ? "You've answered everything — your report is one step away." : `You're ${resume.percent}% through. Pick up where you left off.`}
            </p>
          </div>
          <Button onClick={() => router.push(resume.done ? "/summary" : "/q")} className="shrink-0">
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </m.div>
      )}
      {expiredLink && !resume && (
        <p role="status" className="mb-6 rounded-2xl bg-[#fdf0e3] px-4 py-3 text-center text-sm text-[#7a4a12]">
          That continue link has expired or was already used up. Start again below — it only takes a few minutes.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        {/* Left: what this is */}
        <div className="text-center lg:text-left">
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-medium uppercase tracking-[0.22em] text-teal-deep"
          >
            {copy.eyebrow}
          </m.p>

          <h1 className="mt-4 font-display text-[2.4rem] leading-[1.05] text-forest sm:text-[3.4rem]">
            {words.map((w, i) => (
              <span
                key={i}
                // Pure-CSS word reveal: starts with the first paint instead of waiting
                // for JavaScript, so the headline counts as visible immediately.
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                className={`word-in inline-block ${w === "FUYL" ? "text-teal" : ""}`}
              >
                {w}&nbsp;
              </span>
            ))}
          </h1>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted lg:mx-0"
          >
            {copy.body}
          </m.p>

          <m.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
            className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
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
        </div>

        {/* Right: how to start */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="rounded-3xl bg-white/55 p-5 shadow-[inset_0_0_0_1px_rgba(18,41,31,0.06)] sm:p-6"
        >
          <p className="text-sm font-medium text-forest">{assisted ? "Choose how you'd like to answer" : "Ready when you are"}</p>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Button size="lg" onClick={() => start("standard")} loading={loading === "standard"} disabled={loading !== null} className="w-full">
                Start the assessment
              </Button>
              {assisted && <p className="mt-1.5 text-center text-xs text-muted">Tap an answer for each question</p>}
            </div>
            {assisted && (
              <div>
                <Button size="lg" variant="glass" onClick={() => router.push("/chat")} disabled={loading !== null} className="w-full">
                  <Sparkles className="h-4 w-4 text-teal-deep" aria-hidden /> Assisted assessment
                </Button>
                <p className="mt-1.5 text-center text-xs text-muted">Answer in your own words — our AI assistant understands you</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-col items-center gap-2">
            {human.widget}
            <Honeypot value={hp} onChange={setHp} />
            <p role="alert" aria-live="polite" className="min-h-5 text-center text-sm text-ember-deep">
              {error}
            </p>
            <p className="text-center text-xs leading-relaxed text-muted">{consentText}</p>
          </div>
        </m.div>
      </div>

      <div className="mt-8 border-t border-line/50 pt-5">
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted" aria-label="Product quality">
          {trust.map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-3 max-w-3xl text-center text-xs leading-relaxed text-muted">{disclaimer}</p>
      </div>
    </div>
  );
}
