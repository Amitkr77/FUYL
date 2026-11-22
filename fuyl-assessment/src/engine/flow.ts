import { evaluate } from "./conditions";
import { buildContext } from "./scoring";
import { firstName, render } from "./text";
import {
  BLOCK_ORDER,
  type Answers,
  type KnowledgeBase,
  type NextStep,
  type Question,
  type RenderedQuestion,
} from "./types";

/** Questions in the order they are asked: block order, then `order` within block. */
export function orderedQuestions(kb: KnowledgeBase): Question[] {
  return [...kb.questions].sort(
    (a, b) => BLOCK_ORDER.indexOf(a.block) - BLOCK_ORDER.indexOf(b.block) || a.order - b.order || a.key.localeCompare(b.key),
  );
}

/**
 * Drop answers to questions that are no longer visible (e.g. after the user
 * edits an earlier answer and a branch closes). Walks the questions in order,
 * re-evaluating visibility against the answers kept so far, so a hidden
 * question's own answer can never keep a downstream branch open.
 */
export function prune(kb: KnowledgeBase, answers: Answers): Answers {
  const kept: Answers = {};
  for (const q of orderedQuestions(kb)) {
    if (!answers[q.key]) continue;
    const ctx = buildContext(kb, kept);
    if (evaluate(q.showIf, ctx)) kept[q.key] = answers[q.key];
  }
  return kept;
}

function renderQuestion(q: Question, name: string | undefined): RenderedQuestion {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bands: _bands, ...rest } = q;
  return { ...rest, prompt: render(q.prompt, name), why: q.why ? render(q.why, name) : undefined };
}

/** Render one question by key with the user's name filled in (for Back / Edit). */
export function renderQuestionByKey(kb: KnowledgeBase, answers: Answers, key: string): RenderedQuestion | undefined {
  const q = kb.questions.find((x) => x.key === key);
  return q ? renderQuestion(q, firstName(kb, prune(kb, answers))) : undefined;
}

/** The first `stop`-level safety rule currently triggered, if any. */
export function triggeredStop(kb: KnowledgeBase, answers: Answers) {
  const ctx = buildContext(kb, answers);
  return kb.safetyRules.find((r) => r.level === "stop" && evaluate(r.when, ctx));
}

/**
 * Visible, unanswered questions still to ask, in order (answers must already
 * be pruned). Once `questionCap` answers are reached, follow-ups drop out.
 */
export function remainingQuestions(kb: KnowledgeBase, answers: Answers): Question[] {
  const ctx = buildContext(kb, answers);
  const capReached = Object.keys(answers).length >= kb.settings.questionCap;
  return orderedQuestions(kb).filter(
    (q) => !Object.prototype.hasOwnProperty.call(answers, q.key) && evaluate(q.showIf, ctx) && !(capReached && q.tier === "followup"),
  );
}

/** Render a question for display (fills in {name}). */
export function renderForUser(kb: KnowledgeBase, answers: Answers, q: Question): RenderedQuestion {
  return renderQuestion(q, firstName(kb, answers));
}

/**
 * Decide what comes next.
 *  1. A triggered `stop` rule ends the assessment immediately.
 *  2. Otherwise the first unanswered, visible question wins — except that once
 *     `questionCap` answers are reached, follow-up questions are skipped
 *     (core questions such as safety gates are always asked).
 *  3. No questions left → complete.
 *
 * `progress` (0–1) is an estimate: answered / (answered + remaining visible),
 * so the bar never jumps backwards when a branch opens.
 */
export function nextStep(kb: KnowledgeBase, rawAnswers: Answers, opts: { alreadyPruned?: boolean } = {}): NextStep {
  // Pruning is O(questions²). Callers that only ever add answers to visible
  // questions in order (e.g. the KB checker's simulated walks) can skip it.
  const answers = opts.alreadyPruned ? rawAnswers : prune(kb, rawAnswers);

  const stop = triggeredStop(kb, answers);
  if (stop) return { kind: "stopped", rule: { key: stop.key, title: stop.title, message: stop.message } };

  const answeredCount = Object.keys(answers).length;
  const remaining = remainingQuestions(kb, answers);

  const next = remaining[0];
  if (!next) return { kind: "complete" };

  const progress = answeredCount / (answeredCount + remaining.length);
  return {
    kind: "question",
    question: renderQuestion(next, firstName(kb, answers)),
    progress: Math.round(progress * 100) / 100,
    answeredCount,
    remaining: remaining.length - 1,
  };
}
