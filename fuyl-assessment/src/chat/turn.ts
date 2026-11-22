import {
  buildSummary,
  firstName,
  nextStep,
  prune,
  remainingQuestions,
  renderForUser,
  validateAnswer,
  type AnswerInput,
  type Answers,
  type KnowledgeBase,
  type Question,
} from "@/engine";
import { applyAnswer } from "@/flow/state";
import { aiInputFor, fullRequest, hybridRequest, parseFull, parseHybrid, type AiPort } from "./ai";
import { GREETING, RECAP_INTRO, URGENT_REPLY, ackFor, cleanAiText, clarifyText, isUrgent, message, questionText } from "./script";
import type { ChatAsk, ChatMessage, TurnInput } from "./types";
import { understand } from "./understand";

/**
 * One chat turn: the user's message (or tapped chip) in, the updated answers
 * and the assistant's reply out. Pure apart from the injected AI port.
 *
 * Whatever the mode, answers only ever enter through the engine's validation,
 * safety stops come from the engine's rules, and the conversation ends only
 * when the engine says the questionnaire is complete. AI failures (rate limit,
 * timeout, bad JSON) fall back to the built-in understanding for that turn.
 */

export interface ChatState {
  answers: Answers;
  path: string[];
  askKey?: string;
}

export interface TurnContext extends ChatState {
  kb: KnowledgeBase;
  mode: "hybrid" | "full";
  /** null → built-in understanding only. */
  ai: AiPort | null;
  /** Transcript so far, INCLUDING the user's latest message. */
  history: ChatMessage[];
}

export interface TurnResult extends ChatState {
  add: ChatMessage[];
  /** How this turn was understood. */
  via: "ai" | "builtin" | "chip" | "guard";
  /** True when AI was configured but failed and we fell back. */
  aiFailed: boolean;
}

const has = (a: Answers, k: string) => Object.prototype.hasOwnProperty.call(a, k);
const cleanPath = (path: string[], answers: Answers) => path.filter((k, i) => has(answers, k) && path.indexOf(k) === i);

/** The question the user is being asked right now: the stored askKey if still open, else the engine's next one. */
export function currentQuestion(kb: KnowledgeBase, answers: Answers, askKey?: string): Question | undefined {
  const kept = prune(kb, answers);
  const open = remainingQuestions(kb, kept);
  return open.find((q) => q.key === askKey) ?? open[0];
}

/** Assistant messages after the answers changed: the next question, a safety stop, or the recap. */
export function nextMessages(kb: KnowledgeBase, answers: Answers, ack: string): { add: ChatMessage[]; askKey?: string } {
  const step = nextStep(kb, answers);
  if (step.kind === "stopped") {
    return { add: [message({ role: "assistant", kind: "stop", via: "builtin", text: `${step.rule.title}. ${step.rule.message}` })] };
  }
  if (step.kind === "complete") {
    const lines = buildSummary(kb, prune(kb, answers)).map((l) => l.text);
    return { add: [message({ role: "assistant", kind: "recap", via: "builtin", text: RECAP_INTRO(firstName(kb, answers)), lines })] };
  }
  return {
    add: [message({ role: "assistant", kind: "question", via: "builtin", text: questionText(step.question, ack) })],
    askKey: step.question.key,
  };
}

/** Opening messages for a new chat. */
export function openingMessages(kb: KnowledgeBase): { add: ChatMessage[]; askKey?: string } {
  const first = nextMessages(kb, {}, "");
  return { add: [message({ role: "assistant", kind: "note", via: "builtin", text: GREETING }), ...first.add], askKey: first.askKey };
}

/** Client description of the question being asked (chips, number keypad). */
export function askFor(kb: KnowledgeBase, answers: Answers, askKey?: string): ChatAsk | undefined {
  const step = nextStep(kb, answers);
  if (step.kind !== "question") return undefined;
  const q = currentQuestion(kb, answers, askKey);
  if (!q) return undefined;
  return {
    key: q.key,
    type: q.type,
    options: q.options?.map((o) => ({ value: o.value, label: o.label, exclusive: o.exclusive || undefined })),
    maxSelect: q.maxSelect,
    min: q.min,
    max: q.max,
    unit: q.unit,
    placeholder: q.placeholder,
  };
}

/**
 * Apply several answers in any order (Full-AI mode). Each must be a real,
 * currently visible question (or a correction of an answered one) and pass
 * validation; anything else is ignored.
 */
export function applyMany(kb: KnowledgeBase, answers: Answers, path: string[], updates: { key: string; input: AnswerInput }[]) {
  let next = prune(kb, answers);
  const accepted: string[] = [];
  for (const u of updates) {
    const q = kb.questions.find((x) => x.key === u.key);
    if (!q) continue;
    const open = has(next, q.key) || remainingQuestions(kb, next).some((x) => x.key === q.key);
    if (!open) continue;
    const v = validateAnswer(q, u.input);
    if (!v.ok) continue;
    next = prune(kb, { ...next, [q.key]: v.answer });
    accepted.push(q.key);
  }
  const nextPath = cleanPath([...path.filter((k) => !accepted.includes(k)), ...accepted], next);
  return { answers: next, path: nextPath, accepted };
}

/** Apply one answer: strictly ordered when it's the engine's next question, otherwise as an out-of-order answer (Full-AI mode). */
function applyOne(kb: KnowledgeBase, answers: Answers, path: string[], q: Question, input: AnswerInput) {
  if (remainingQuestions(kb, answers)[0]?.key === q.key || has(answers, q.key)) {
    const a = applyAnswer(kb, answers, path, q.key, input);
    return a.ok ? { ok: true as const, answers: a.answers, path: a.path } : { ok: false as const, error: a.error };
  }
  const v = validateAnswer(q, input);
  if (!v.ok) return { ok: false as const, error: v.error };
  const a = applyMany(kb, answers, path, [{ key: q.key, input }]);
  return a.accepted.length ? { ok: true as const, answers: a.answers, path: a.path } : { ok: false as const, error: "That option isn't available." };
}

// ─── Hybrid ────────────────────────────────────────────────────────────────

async function hybridTurn(ctx: TurnContext, text: string, forceBuiltin = false): Promise<TurnResult> {
  const { kb } = ctx;
  const answers = prune(kb, ctx.answers);
  const q = currentQuestion(kb, answers, ctx.askKey);
  if (!q) return { ...ctx, add: nextMessages(kb, answers, "").add, via: "builtin", aiFailed: false };
  const rendered = renderForUser(kb, answers, q);

  let input: AnswerInput | null = null;
  let ack = "";
  let clarify: string | null = null;
  let via: TurnResult["via"] = "builtin";
  let aiFailed = false;

  if (ctx.ai && !forceBuiltin) {
    try {
      const out = parseHybrid(await ctx.ai.json(hybridRequest(rendered, text)));
      if (!out) throw new Error("bad AI output");
      via = "ai";
      if (out.action === "answer") {
        input = aiInputFor(q, out);
        ack = cleanAiText(out.ack, 120);
      } else {
        clarify = cleanAiText(out.message, 300) || clarifyText(rendered);
      }
    } catch {
      aiFailed = true;
    }
  }

  if (!ctx.ai || forceBuiltin || aiFailed) {
    via = "builtin";
    const u = understand(q, text);
    if (u.ok) {
      input = u.input;
      ack = ackFor(`${q.key}:${text}`);
    } else clarify = clarifyText(rendered, u.reason, u.max);
  }

  if (input) {
    const r = applyOne(kb, answers, ctx.path, q, input);
    if (r.ok) {
      const next = nextMessages(kb, r.answers, ack || ackFor(q.key));
      return { answers: r.answers, path: r.path, askKey: next.askKey, add: next.add, via, aiFailed };
    }
    clarify = `${r.error} ${q.type === "number" ? "" : clarifyText(rendered)}`.trim();
  }

  return {
    answers,
    path: ctx.path,
    askKey: q.key,
    add: [message({ role: "assistant", kind: "clarify", via, text: clarify ?? clarifyText(rendered) })],
    via,
    aiFailed,
  };
}

// ─── Full AI ───────────────────────────────────────────────────────────────

async function fullTurn(ctx: TurnContext): Promise<TurnResult> {
  const { kb } = ctx;
  const answers = prune(kb, ctx.answers);
  const needed = remainingQuestions(kb, answers).map((q) => renderForUser(kb, answers, q));
  if (!needed.length || nextStep(kb, answers).kind !== "question") {
    return { ...ctx, answers, add: nextMessages(kb, answers, "").add, via: "builtin", aiFailed: false };
  }

  let out;
  try {
    out = parseFull(
      await ctx.ai!.json(fullRequest({ kb, answers, needed, history: ctx.history, name: firstName(kb, answers) })),
    );
    if (!out) throw new Error("bad AI output");
  } catch {
    const last = ctx.history.findLast((m) => m.role === "user");
    const r = await hybridTurn(ctx, last?.text ?? "", true);
    return { ...r, aiFailed: true };
  }

  const updates = out.answers
    .map((a) => {
      const q = kb.questions.find((x) => x.key === a.key);
      return q ? { key: q.key, input: aiInputFor(q, a) } : null;
    })
    .filter((x): x is { key: string; input: AnswerInput } => Boolean(x));
  const applied = applyMany(kb, answers, ctx.path, updates);

  const step = nextStep(kb, applied.answers);
  // The engine, not the model, decides stops and completion.
  if (step.kind !== "question") {
    const next = nextMessages(kb, applied.answers, "");
    return { answers: applied.answers, path: applied.path, askKey: undefined, add: next.add, via: "ai", aiFailed: false };
  }

  const open = remainingQuestions(kb, applied.answers);
  const asked = open.find((q) => q.key === out.ask_key);
  const reply = cleanAiText(out.reply);
  if (asked && reply) {
    return {
      answers: applied.answers,
      path: applied.path,
      askKey: asked.key,
      add: [message({ role: "assistant", kind: "question", via: "ai", text: reply })],
      via: "ai",
      aiFailed: false,
    };
  }
  // The model didn't ask a valid open question: ask the engine's next one ourselves.
  const next = nextMessages(kb, applied.answers, reply ? "" : ackFor(String(applied.accepted)));
  const add = reply ? [message({ role: "assistant", kind: "note", via: "ai", text: reply }), ...next.add] : next.add;
  return { answers: applied.answers, path: applied.path, askKey: next.askKey, add, via: "ai", aiFailed: false };
}

// ─── Entry point ───────────────────────────────────────────────────────────

export async function runTurn(ctx: TurnContext, input: TurnInput): Promise<TurnResult> {
  const { kb } = ctx;

  if (input.kind === "text" && isUrgent(input.text)) {
    return {
      answers: ctx.answers,
      path: ctx.path,
      askKey: ctx.askKey,
      add: [message({ role: "assistant", kind: "note", via: "guard", text: URGENT_REPLY })],
      via: "guard",
      aiFailed: false,
    };
  }

  if (input.kind === "choice") {
    const answers = prune(kb, ctx.answers);
    const q = currentQuestion(kb, answers, ctx.askKey);
    if (!q || q.key !== input.key) {
      // A stale chip (e.g. from another tab): re-show what we're actually asking.
      return { ...ctx, answers, add: nextMessages(kb, answers, "").add, via: "chip", aiFailed: false };
    }
    const r = applyOne(kb, answers, ctx.path, q, input.input);
    if (!r.ok) {
      return {
        answers,
        path: ctx.path,
        askKey: q.key,
        add: [message({ role: "assistant", kind: "clarify", via: "chip", text: r.error })],
        via: "chip",
        aiFailed: false,
      };
    }
    // Full-AI mode: let the advisor react and lead on; otherwise ask the next question ourselves.
    if (ctx.mode === "full" && ctx.ai && nextStep(kb, r.answers).kind === "question") {
      const t = await fullTurn({ ...ctx, answers: r.answers, path: r.path, askKey: undefined });
      return { ...t, via: t.aiFailed ? "chip" : "ai" };
    }
    const next = nextMessages(kb, r.answers, ackFor(q.key));
    return { answers: r.answers, path: r.path, askKey: next.askKey, add: next.add, via: "chip", aiFailed: false };
  }

  if (ctx.mode === "full" && ctx.ai) return fullTurn(ctx);
  return hybridTurn(ctx, input.text);
}
