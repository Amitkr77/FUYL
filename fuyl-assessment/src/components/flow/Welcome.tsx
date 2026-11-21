"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { Check, Clock, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, ApiError, type StateResponse } from "@/lib/client";

const ICONS = [Clock, MessageCircle, FileText];

export function Welcome({
  copy,
  consentText,
  disclaimer,
}: {
  copy: { eyebrow: string; title: string; body: string; facts: string[] };
  consentText: string;
  disclaimer: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState(false);

  // Offer to resume an unfinished assessment in this browser.
  useEffect(() => {
    api<StateResponse>("/api/session")
      .then((r) => setResume(Boolean(r.state && r.state.path.length > 0)))
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
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-teal"
      >
        {copy.eyebrow}
      </motion.p>

      <h1 className="mt-5 text-center font-display text-[2.6rem] leading-[1.05] text-forest sm:text-6xl">
        {words.map((w, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`inline-block ${w === "FUYL" ? "italic text-teal" : ""}`}
          >
            {w}&nbsp;
          </motion.span>
        ))}
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mx-auto mt-5 max-w-md text-center text-[15px] leading-relaxed text-muted"
      >
        {copy.body}
      </motion.p>

      <motion.ul
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {copy.facts.map((f, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <motion.li
              key={f}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-forest"
            >
              <Icon className="h-3.5 w-3.5 text-teal" aria-hidden /> {f}
            </motion.li>
          );
        })}
      </motion.ul>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="mt-10">
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
          <Button size="lg" onClick={start} loading={loading} className="w-full sm:w-auto">
            Start the assessment
          </Button>
          {resume && (
            <button onClick={() => router.push("/q")} className="text-sm text-teal-deep underline-offset-4 hover:underline">
              Continue where you left off
            </button>
          )}
          <p role="alert" aria-live="polite" className="min-h-5 text-sm text-ember">
            {error}
          </p>
        </div>
      </motion.div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/80">{disclaimer}</p>
    </div>
  );
}
