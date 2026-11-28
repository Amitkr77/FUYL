"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, HeartPulse, Lightbulb, Printer, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import type { AnswerInput } from "@/engine";
import type { FlowState, View } from "@/flow/state";
import { api, ApiError, type StateResponse } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { QuestionCard } from "./QuestionCard";

/**
 * The question player. The server decides what comes next; this component
 * renders it with direction-aware transitions, handles Back (re-shows earlier
 * answers pre-filled) and Edit-from-summary (`/q?edit=<key>`).
 */
export function Player({ initialState, assisted }: { initialState?: FlowState; assisted?: { input: "text" | "chips" } }) {
  const router = useRouter();
  const params = useSearchParams();
  const editKey = params.get("edit");
  const reduce = useReducedMotion();

  // Server-rendered first view (no skeleton, no extra round-trip).
  const [state, setState] = useState<FlowState | null>(initialState ?? null);
  const usedInitial = useRef(Boolean(initialState));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [fatal, setFatal] = useState<string | null>(null);
  // What to show above the next card: the assistant's reading of a typed answer and/or a "Did you know?" insight.
  const [ack, setAck] = useState<{ text: string; understood: string[]; insight?: string } | null>(null);
  const [clarify, setClarify] = useState<string | null>(null);
  // Typed answers the assistant couldn't place on the current question (after one, the tiles are highlighted).
  const [misses, setMisses] = useState(0);

  // Browser history: each question gets its own entry (/q?q=<key>), so the
  // browser / Android Back button steps to the previous question instead of
  // leaving the assessment. `depth` counts entries we pushed in this visit.
  const qParam = params.get("q");
  const depth = useRef(0);
  const syncUrl = useCallback((s: FlowState | null, mode: "push" | "replace") => {
    if (!s || s.view.kind !== "question") return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", s.view.question.key);
    if (url.href === window.location.href) return;
    if (mode === "push") {
      window.history.pushState(null, "", url);
      depth.current++;
    } else {
      window.history.replaceState(null, "", url);
    }
  }, []);

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && (e.code === "NO_SESSION" || e.code === "SUBMITTED")) {
        router.replace("/");
        return;
      }
      if (e instanceof ApiError && e.code === "STALE") {
        // Another tab changed the answers: show where things really stand.
        api<StateResponse>("/api/session")
          .then((r) => (r.state ? setState(r.state) : router.replace("/")))
          .catch(() => {});
        setError(null);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    },
    [router],
  );

  // Initial load: the question in the URL (refresh), a question to edit, or the frontier.
  useEffect(() => {
    if (usedInitial.current && initialState) {
      // The server already rendered the right question; just record it in the URL.
      usedInitial.current = false;
      syncUrl(initialState, "replace");
      return;
    }
    let cancelled = false;
    const wanted = editKey ?? new URLSearchParams(window.location.search).get("q");
    const load = wanted
      ? api<StateResponse>(`/api/question?key=${encodeURIComponent(wanted)}`).catch(() => api<StateResponse>("/api/session"))
      : api<StateResponse>("/api/session");
    load
      .then((r) => {
        if (cancelled) return;
        if (!r.state) router.replace("/");
        else {
          setState(r.state);
          syncUrl(r.state, "replace");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === "NO_SESSION") router.replace("/");
        else setFatal(e instanceof ApiError ? e.message : "We couldn't load your assessment.");
      });
    return () => {
      cancelled = true;
    };
    // syncUrl is stable; load once per edit target. initialState is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKey, router, syncUrl]);

  // Browser Back / Forward changed ?q= → show that question.
  useEffect(() => {
    if (!state || !qParam) return;
    const v = state.view;
    if (v.kind === "question" && v.question.key === qParam) return;
    const from = v.kind === "question" ? state.path.indexOf(v.question.key) : state.path.length;
    const to = state.path.indexOf(qParam);
    const goingBack = to !== -1 && (from === -1 || to < from);
    if (goingBack) depth.current = Math.max(0, depth.current - 1);
    let cancelled = false;
    api<StateResponse>(`/api/question?key=${encodeURIComponent(qParam)}`)
      .then((r) => {
        if (cancelled || !r.state) return;
        setDirection(goingBack ? -1 : 1);
        setState(r.state);
      })
      .catch(() =>
        api<StateResponse>("/api/session").then((r) => {
          if (cancelled || !r.state) return;
          setState(r.state);
          syncUrl(r.state, "replace");
        }),
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only react to URL changes; `state` is read as of that change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  // Finished → summary.
  useEffect(() => {
    if (state?.view.kind === "complete") router.replace("/summary");
  }, [state, router]);

  async function submit(input: AnswerInput) {
    if (!state || state.view.kind !== "question" || busy) return;
    setBusy(true);
    setError(null);
    setAck(null);
    setClarify(null);
    try {
      const r = await api<StateResponse>("/api/answer", {
        method: "POST",
        body: JSON.stringify({ key: state.view.question.key, input }),
      });
      setDirection(1);
      setMisses(0);
      if (r.insight) setAck({ text: "", understood: [], insight: r.insight });
      // Editing from the summary returns there once the branch is settled.
      if (editKey && r.state?.view.kind !== "stopped" && isAnsweredQuestion(r.state)) router.replace("/summary");
      else {
        setState(r.state);
        syncUrl(r.state, "push");
      }
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }

  /** Assisted mode: the user answered in their own words. */
  async function freeText(text: string) {
    if (!state || state.view.kind !== "question" || busy) return;
    setBusy(true);
    setError(null);
    setClarify(null);
    try {
      const r = await api<{ state?: FlowState; ack?: string; understood?: string[]; clarify?: string; insight?: string }>("/api/assist", {
        method: "POST",
        body: JSON.stringify({ key: state.view.question.key, text }),
      });
      if (r.clarify || !r.state) {
        setClarify(r.clarify ?? "Could you say that a little differently?");
        setMisses((n) => n + 1);
        return;
      }
      setDirection(1);
      setMisses(0);
      setAck({ text: r.ack ?? "", understood: r.understood ?? [], insight: r.insight });
      if (editKey && r.state.view.kind !== "stopped" && isAnsweredQuestion(r.state)) router.replace("/summary");
      else {
        setState(r.state);
        syncUrl(r.state, "push");
      }
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }

  async function back() {
    const key = state && "backKey" in state.view ? state.view.backKey : undefined;
    if (!key || busy) return;
    // Keep the in-app arrow and the browser's Back button in step: if we
    // pushed the entry we're on, go back through history (the ?q= effect loads it).
    if (depth.current > 0 && state?.view.kind === "question") {
      window.history.back();
      return;
    }
    setBusy(true);
    setError(null);
    setAck(null);
    setClarify(null);
    setMisses(0);
    try {
      const r = await api<StateResponse>(`/api/question?key=${encodeURIComponent(key)}`);
      setDirection(-1);
      setState(r.state);
      syncUrl(r.state, "replace");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }

  if (fatal) {
    return (
      <Shell>
        <div className="glass rounded-[var(--radius-glass)] p-10 text-center">
          <p className="text-forest">{fatal}</p>
          <Button className="mt-6" onClick={() => location.reload()}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  const view = state?.view;
  const progress = view?.kind === "question" ? view.progress : view?.kind === "stopped" ? 1 : 0;
  const backKey = view && "backKey" in view ? view.backKey : undefined;

  const offset = reduce ? 0 : 40;

  return (
    <Shell>
      <div className="mb-5 flex items-center gap-4">
        <button
          type="button"
          onClick={back}
          disabled={!backKey || busy}
          aria-label="Previous question"
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest transition-opacity disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/50"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <m.div
            className="h-full rounded-full bg-gradient-to-r from-teal to-forest"
            initial={false}
            animate={{ width: `${Math.max(4, progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        </div>
      </div>

      {view?.kind === "question" && (
        <div className="-mt-2 mb-4 px-1 text-xs text-muted" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="whitespace-nowrap rounded-full bg-white/60 px-2.5 py-1 font-medium uppercase tracking-[0.14em] text-teal-deep">
              {BLOCK_LABEL[view.question.block] ?? ""}
              <span className="ml-1.5 font-normal normal-case tracking-normal text-muted">· {sectionOf(view.question.block)} of 4</span>
            </span>
            <span className="tabular-nums">{timeLeft(view)}</span>
          </div>
          {view.preview && view.preview.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-forest">
              <TrendingUp className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              So far, <strong className="font-medium">{view.preview.join(" and ")}</strong> look{view.preview.length === 1 ? "s" : ""} like your focus
              {view.preview.length === 1 ? " area" : " areas"}.
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {ack && view?.kind === "question" && (ack.text || ack.understood.length > 0 || ack.insight) && (
          <m.div
            key={ack.understood.join("|") + ack.text + (ack.insight ?? "")}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="glass mb-3 space-y-1 rounded-2xl px-4 py-2.5 text-[13px] leading-snug text-forest"
          >
            {(ack.text || ack.understood.length > 0) && (
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
                <span>
                  {ack.text && <span className="mr-1">{ack.text}</span>}
                  {ack.understood.length > 0 && <span className="text-muted">Noted: {ack.understood.join(" · ")}</span>}
                </span>
              </p>
            )}
            {ack.insight && (
              <p className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-ember-deep" aria-hidden />
                <span>{ack.insight}</span>
              </p>
            )}
          </m.div>
        )}
      </AnimatePresence>

      <div className="glass-strong relative overflow-clip rounded-[var(--radius-glass)] px-5 py-7 sm:px-10 sm:py-9">
        {!view ? (
          <Skeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={viewKey(view)}
              custom={direction}
              initial={{ opacity: 0, y: offset * direction * 0.5, filter: reduce ? "none" : "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -offset * direction * 0.5, filter: reduce ? "none" : "blur(6px)" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              {view.kind === "question" && (
                <QuestionCard
                  question={view.question}
                  answer={view.answer}
                  busy={busy}
                  error={error}
                  onSubmit={submit}
                  assist={
                    assisted
                      ? {
                          // "Own words only" still reveals the tiles after two misunderstandings, so nobody gets stuck.
                          showOptions: assisted.input === "chips" || misses >= 2,
                          highlightOptions: misses >= 1,
                          clarify,
                          onText: freeText,
                        }
                      : undefined
                  }
                />
              )}
              {view.kind === "stopped" && <StopScreen title={view.title} message={view.message} />}
              {view.kind === "complete" && <Skeleton />}
            </m.div>
          </AnimatePresence>
        )}
      </div>
      {view?.kind === "question" && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          {assisted ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> Tap an answer or type it in your own words. Your answers save automatically.
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> Your answers save automatically — you can leave and pick up where you left off.
            </>
          )}
        </p>
      )}
    </Shell>
  );
}

const BLOCK_LABEL: Record<string, string> = { about: "About you", lifestyle: "Your lifestyle", feel: "How you feel", safety: "Your health" };
const SECTIONS = ["about", "lifestyle", "feel", "safety"];
const sectionOf = (block: string) => Math.max(1, SECTIONS.indexOf(block) + 1);

/** "About 2 min left" from the estimated questions still to come (~7 s each), with a halfway cheer. */
function timeLeft(view: Extract<View, { kind: "question" }>): string {
  if (typeof view.remaining !== "number") return "Changing an earlier answer";
  if (view.remaining === 0) return "Last question";
  const secs = (view.remaining + 1) * 7;
  const time = secs < 50 ? "under a minute left" : `about ${Math.round(secs / 60)} min left`;
  return view.progress >= 0.45 && view.progress < 0.6 ? `Halfway there · ${time}` : time.charAt(0).toUpperCase() + time.slice(1);
}

const viewKey = (v: View) => (v.kind === "question" ? `q:${v.question.key}` : v.kind);

/** After an edit, true when the server sent us to an already-answered question or the end. */
function isAnsweredQuestion(state: FlowState | null): boolean {
  if (!state) return false;
  if (state.view.kind === "complete") return true;
  return state.view.kind === "question" && Boolean(state.view.answer);
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}

function Skeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-4">
      <div className="mx-auto h-9 w-3/4 rounded-xl bg-white/60" />
      <div className="mx-auto h-4 w-1/3 rounded bg-white/50" />
      <div className="space-y-3 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-white/50" />
        ))}
      </div>
    </div>
  );
}

function StopScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center">
      <m.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage"
      >
        <HeartPulse className="h-6 w-6 text-forest" aria-hidden />
      </m.div>
      <h1 className="mt-6 text-balance font-display text-[2rem] leading-tight text-forest sm:text-4xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">{message}</p>
      <p className="mx-auto mt-6 max-w-md text-[13px] text-muted">
        Made a mistake? Use the back arrow above to change your answer.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-forest hover:bg-white/80"
        >
          <Printer className="h-4 w-4 text-teal-deep" aria-hidden /> Save this note for your doctor
        </button>
        <a href="https://fuyl.in" className="text-sm font-medium text-teal-deep underline-offset-4 hover:underline">
          Visit fuyl.in
        </a>
      </div>
    </div>
  );
}
