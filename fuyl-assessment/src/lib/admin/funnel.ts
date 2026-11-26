import "server-only";
import { nextStep, orderedQuestions, type Answers, type KnowledgeBase } from "@/engine";
import { connectDB } from "@/lib/db";
import { AssessmentSession } from "@/models/assessment";

/**
 * Where people leave, worked out from the sessions themselves (no extra
 * tracking): each session's answered questions, plus — for sessions that went
 * quiet — the question they were looking at when they stopped.
 */

export interface FunnelRow {
  key: string;
  prompt: string;
  /** Sessions that saw this question (answered it, or left on it). */
  reached: number;
  /** Sessions that left on this question. */
  left: number;
}

export interface Funnel {
  days: number;
  mode: "all" | "standard" | "assisted";
  started: number;
  answeredOne: number;
  finished: number;
  submitted: number;
  stopped: number;
  inProgress: number;
  rows: FunnelRow[];
}

/** A session idle for this long without finishing counts as having left. */
const IDLE_MS = 30 * 60_000;
const MAX_SESSIONS = 5000;

export async function buildFunnel(kb: KnowledgeBase, days: number, mode: Funnel["mode"]): Promise<Funnel> {
  await connectDB();
  const since = new Date(Date.now() - days * 86_400_000);
  const filter: Record<string, unknown> = { createdAt: { $gte: since } };
  if (mode !== "all") filter.mode = mode === "standard" ? { $in: ["standard", null] } : "assisted";
  const sessions = await AssessmentSession.find(filter, { answers: 1, path: 1, status: 1, updatedAt: 1 })
    .sort({ createdAt: -1 })
    .limit(MAX_SESSIONS)
    .lean();

  const reached = new Map<string, number>();
  const left = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  let answeredOne = 0;
  let finished = 0;
  let submitted = 0;
  let stopped = 0;
  let inProgress = 0;
  const now = Date.now();

  for (const s of sessions) {
    const path = (s.path ?? []) as string[];
    if (path.length) answeredOne++;
    for (const k of new Set(path)) bump(reached, k);
    if (s.status === "submitted") {
      submitted++;
      finished++;
      continue;
    }
    if (s.status === "complete") {
      finished++;
      continue;
    }
    if (s.status === "stopped") {
      stopped++;
      continue;
    }
    if (now - new Date(s.updatedAt as Date).getTime() < IDLE_MS) {
      inProgress++;
      continue;
    }
    const step = nextStep(kb, (s.answers ?? {}) as Answers);
    if (step.kind === "question") {
      bump(reached, step.question.key);
      bump(left, step.question.key);
    }
  }

  const rows = orderedQuestions(kb)
    .map((q) => ({ key: q.key, prompt: q.prompt.replace(/\{name\},?\s*/g, ""), reached: reached.get(q.key) ?? 0, left: left.get(q.key) ?? 0 }))
    .filter((r) => r.reached > 0);

  return { days, mode, started: sessions.length, answeredOne, finished, submitted, stopped, inProgress, rows };
}
