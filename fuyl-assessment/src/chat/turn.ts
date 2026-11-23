import {
  nextStep,
  prune,
  remainingQuestions,
  renderForUser,
  validateAnswer,
  type Answer,
  type AnswerInput,
  type Answers,
  type KnowledgeBase,
  type Question,
} from "@/engine";
import { applyAnswer, frontierView, type FlowState } from "@/flow/state";
import { FULL_WINDOW, aiInputFor, assistRequest, parseAssist, type AiPort } from "./ai";
import { URGENT_REPLY, cleanAiText, clarifyText, isUrgent } from "./script";
import { understand } from "./understand";

/**
 * Assisted assessment: understand a free-text answer to the question on
 * screen. Same cards and flow as the standard assessment — this only turns
 * "honestly barely 5 or 6 hrs" into the "5–6 hours" option.
 *
 * Whatever the mode, answers only enter through the engine's validation,
 * safety stops come from the engine's rules, and AI failures (rate limit,
 * timeout, bad JSON) fall back to the built-in understanding for that answer.
 */

export interface AssistContext {
  kb: KnowledgeBase;
  mode: "hybrid" | "full";
  /** null → built-in understanding only. */
  ai: AiPort | null;
  answers: Answers;
  path: string[];
}

export type AssistResult =
  | {
      ok: true;
      answers: Answers;
      path: string[];
      state: FlowState;
      /** A short warm reaction (AI) — may be empty. */
      ack: string;
      /** What was understood, for the confirmation line: "Sleep: 5–6 hours". */
      understood: string[];
      via: "ai" | "builtin";
      aiFailed: boolean;
    }
  | { ok: false; status?: number; clarify: string; via: "ai" | "builtin" | "guard"; aiFailed: boolean };

const has = (a: Answers, k: string) => Object.prototype.hasOwnProperty.call(a, k);
const cleanPath = (path: string[], answers: Answers) => path.filter((k, i) => has(answers, k) && path.indexOf(k) === i);

/** "5–6 hours", "Energy, Sleep", "31 years" — an answer in the words the user sees. */
export function answerLabel(q: Question, a: Answer): string {
  if (a.values) return a.values.map((v) => q.options?.find((o) => o.value === v)?.label ?? v).join(", ");
  if (a.number !== undefined) return `${a.number}${q.unit ? ` ${q.unit}` : ""}`;
  return a.text ?? "";
}

/** A short topic for a question, for "Also noted: Diet — Vegetarian". */
const topic = (q: Question) => q.key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Apply several answers in any order (Full-AI extras). Each must be a real,
 * currently visible, unanswered question and pass validation; anything else is ignored.
 */
export function applyMany(kb: KnowledgeBase, answers: Answers, path: string[], updates: { key: string; input: AnswerInput }[]) {
  let next = prune(kb, answers);
  const accepted: string[] = [];
  for (const u of updates) {
    const q = kb.questions.find((x) => x.key === u.key);
    if (!q || has(next, q.key)) continue;
    if (!remainingQuestions(kb, next).some((x) => x.key === q.key)) continue;
    const v = validateAnswer(q, u.input);
    if (!v.ok) continue;
    next = prune(kb, { ...next, [q.key]: v.answer });
    accepted.push(q.key);
  }
  return { answers: next, path: cleanPath([...path, ...accepted], next), accepted };
}

export async function assistTurn(ctx: AssistContext, key: string, text: string): Promise<AssistResult> {
  const { kb } = ctx;
  const answers = prune(kb, ctx.answers);
  const q = kb.questions.find((x) => x.key === key);
  const frontier = nextStep(kb, answers);
  const isFrontier = frontier.kind === "question" && frontier.question.key === key;
  if (!q || (!isFrontier && !has(answers, key))) {
    return { ok: false, status: 409, clarify: "This question isn't available right now.", via: "builtin", aiFailed: false };
  }
  if (isUrgent(text)) return { ok: false, clarify: URGENT_REPLY, via: "guard", aiFailed: false };

  const rendered = renderForUser(kb, answers, q);
  const upcoming =
    ctx.mode === "full" && isFrontier
      ? remainingQuestions(kb, answers)
          .filter((x) => x.key !== key)
          .slice(0, FULL_WINDOW)
          .map((x) => renderForUser(kb, answers, x))
      : [];

  let input: AnswerInput | null = null;
  let ack = "";
  let clarify: string | null = null;
  let others: { key: string; input: AnswerInput }[] = [];
  let via: "ai" | "builtin" = "builtin";
  let aiFailed = false;

  if (ctx.ai) {
    try {
      const out = parseAssist(await ctx.ai.json(assistRequest(rendered, text, upcoming)));
      if (!out) throw new Error("bad AI output");
      via = "ai";
      if (out.action === "answer") {
        input = aiInputFor(q, out);
        ack = cleanAiText(out.ack, 120);
        others = out.others
          .map((o) => {
            const oq = upcoming.find((u) => u.key === o.key);
            return oq ? { key: oq.key, input: aiInputFor(oq, o) } : null;
          })
          .filter((x): x is { key: string; input: AnswerInput } => Boolean(x));
      } else {
        clarify = cleanAiText(out.message, 300) || clarifyText(rendered);
      }
    } catch {
      aiFailed = true;
    }
  }

  if (!ctx.ai || aiFailed) {
    via = "builtin";
    const u = understand(q, text);
    if (u.ok) input = u.input;
    else clarify = clarifyText(rendered, u.reason, u.max);
  }

  if (input) {
    const r = applyAnswer(kb, answers, ctx.path, key, input);
    if (r.ok) {
      const understood = [answerLabel(q, r.answers[key])];
      if (!others.length) return { ok: true, answers: r.answers, path: r.path, state: r.state, ack, understood, via, aiFailed };
      // Full-AI extras: questions answered in the same reply are skipped.
      const extra = applyMany(kb, r.answers, r.path, others);
      for (const k of extra.accepted) {
        const oq = kb.questions.find((x) => x.key === k)!;
        understood.push(`${topic(oq)}: ${answerLabel(oq, extra.answers[k])}`);
      }
      const state: FlowState = { view: frontierView(kb, extra.answers, extra.path), path: extra.path };
      return { ok: true, answers: extra.answers, path: extra.path, state, ack, understood, via, aiFailed };
    }
    clarify = q.type === "number" ? r.error : `${r.error} ${clarifyText(rendered)}`;
  }

  return { ok: false, clarify: clarify ?? clarifyText(rendered), via, aiFailed };
}
