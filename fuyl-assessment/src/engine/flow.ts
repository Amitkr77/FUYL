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
export function nextStep(kb: KnowledgeBase, rawAnswers: Answers): NextStep {
  const answers = prune(kb, rawAnswers);

  const stop = triggeredStop(kb, answers);
  if (stop) return { kind: "stopped", rule: { key: stop.key, title: stop.title, message: stop.message } };

  const ctx = buildContext(kb, answers);
  const answeredCount = Object.keys(answers).length;
  const capReached = answeredCount >= kb.settings.questionCap;

  const remaining = orderedQuestions(kb).filter(
    (q) => !answers[q.key] && evaluate(q.showIf, ctx) && !(capReached && q.tier === "followup"),
  );

  const next = remaining[0];
  if (!next) return { kind: "complete" };

  const progress = answeredCount / (answeredCount + remaining.length);
  return {
    kind: "question",
    question: renderQuestion(next, firstName(kb, answers)),
    progress: Math.round(progress * 100) / 100,
    answeredCount,
  };
}
