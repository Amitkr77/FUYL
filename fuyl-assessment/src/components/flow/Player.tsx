"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowLeft, HeartPulse, ShieldCheck } from "lucide-react";
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
export function Player({ initialState }: { initialState?: FlowState }) {
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
    try {
      const r = await api<StateResponse>("/api/answer", {
        method: "POST",
        body: JSON.stringify({ key: state.view.question.key, input }),
      });
      setDirection(1);
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
      <div className="mb-8 flex items-center gap-4">
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
        <div className="-mt-4 mb-4 flex items-center justify-between gap-3 px-1 text-xs text-muted" aria-live="polite">
          <span className="rounded-full bg-white/60 px-2.5 py-1 font-medium uppercase tracking-[0.14em] text-teal-deep">
            {BLOCK_LABEL[view.question.block] ?? ""}
          </span>
          <span className="tabular-nums">
            {typeof view.answered === "number" && typeof view.remaining === "number"
              ? `Question ${view.answered + 1}${view.remaining > 0 ? ` · about ${view.remaining} to go` : " · last one"}`
              : "Changing an earlier answer"}
          </span>
        </div>
      )}

      <div className="glass-strong relative overflow-hidden rounded-[var(--radius-glass)] px-5 py-10 sm:px-12 sm:py-12">
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
                <QuestionCard question={view.question} answer={view.answer} busy={busy} error={error} onSubmit={submit} />
              )}
              {view.kind === "stopped" && <StopScreen title={view.title} message={view.message} />}
              {view.kind === "complete" && <Skeleton />}
            </m.div>
          </AnimatePresence>
        )}
      </div>
      {view?.kind === "question" && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-deep" aria-hidden /> Your answers save automatically — you can leave and pick up where you left off.
        </p>
      )}
    </Shell>
  );
}

const BLOCK_LABEL: Record<string, string> = { about: "About you", lifestyle: "Your lifestyle", feel: "How you feel", safety: "Your health" };

const viewKey = (v: View) => (v.kind === "question" ? `q:${v.question.key}` : v.kind);

/** After an edit, true when the server sent us to an already-answered question or the end. */
function isAnsweredQuestion(state: FlowState | null): boolean {
  if (!state) return false;
  if (state.view.kind === "complete") return true;
  return state.view.kind === "question" && Boolean(state.view.answer);
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl">{children}</div>;
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
      <a href="https://fuyl.in" className="mt-8 inline-block text-sm font-medium text-teal-deep underline-offset-4 hover:underline">
        Visit fuyl.in
      </a>
    </div>
  );
}
