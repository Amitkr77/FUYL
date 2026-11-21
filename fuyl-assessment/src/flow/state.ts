import {
  nextStep,
  prune,
  renderQuestionByKey,
  validateAnswer,
  type Answer,
  type AnswerInput,
  type Answers,
  type KnowledgeBase,
  type RenderedQuestion,
} from "@/engine";

/**
 * Pure session-flow logic shared by the API routes: applying an answer,
 * editing an earlier one, and building what the browser sees. The browser
 * only ever receives `ClientQuestion`s — scoring weights, flags, reasons and
 * branching rules stay on the server.
 */

export interface ClientOption {
  value: string;
  label: string;
  info?: string;
  exclusive?: boolean;
}

export interface ClientQuestion {
  key: string;
  block: string;
  type: "single" | "multi" | "number" | "text";
  prompt: string;
  why?: string;
  helper?: string;
  placeholder?: string;
  options?: ClientOption[];
  maxSelect?: number;
  min?: number;
  max?: number;
  unit?: string;
  maxLength?: number;
}

export type View =
  | {
      kind: "question";
      question: ClientQuestion;
      answer?: Answer;
      /** 0–1 overall progress estimate. */
      progress: number;
      /** Key to show when the user presses Back (undefined on the first question). */
      backKey?: string;
    }
  | { kind: "stopped"; title: string; message: string; backKey?: string }
  | { kind: "complete" };

export interface FlowState {
  view: View;
  path: string[];
}

export function toClientQuestion(q: RenderedQuestion): ClientQuestion {
  return {
    key: q.key,
    block: q.block,
    type: q.type,
    prompt: q.prompt,
    why: q.why,
    helper: q.helper,
    placeholder: q.placeholder,
    options: q.options?.map((o) => ({ value: o.value, label: o.label, info: o.info, exclusive: o.exclusive || undefined })),
    maxSelect: q.maxSelect,
    min: q.min,
    max: q.max,
    unit: q.unit,
    maxLength: q.maxLength,
  };
}

/**
 * Own-property check. A plain `answers[key]` lookup would find inherited
 * members for keys like "__proto__", "constructor" or "toString" and treat
 * them as answered — so user-supplied keys are always checked this way.
 */
const has = (answers: Answers, key: string) => Object.prototype.hasOwnProperty.call(answers, key);
const isQuestion = (kb: KnowledgeBase, key: string) => kb.questions.some((q) => q.key === key);

/** Keep only answered keys, in answered order. */
const cleanPath = (path: string[], answers: Answers) => path.filter((k, i) => answers[k] && path.indexOf(k) === i);

/** The view at the frontier — the next unanswered question, a stop, or completion. */
export function frontierView(kb: KnowledgeBase, answers: Answers, path: string[]): View {
  const step = nextStep(kb, answers);
  const backKey = path.at(-1);
  if (step.kind === "complete") return { kind: "complete" };
  if (step.kind === "stopped") return { kind: "stopped", title: step.rule.title, message: step.rule.message, backKey };
  return { kind: "question", question: toClientQuestion(step.question), progress: step.progress, backKey };
}

/** View of an already-answered question (Back / Edit), pre-filled with its answer. */
export function questionView(kb: KnowledgeBase, answers: Answers, path: string[], key: string): View | null {
  const kept = prune(kb, answers);
  const frontier = nextStep(kb, kept);
  const isFrontier = frontier.kind === "question" && frontier.question.key === key;
  if (!isQuestion(kb, key)) return null;
  if (!has(kept, key) && !isFrontier) return null;
  if (isFrontier) return frontierView(kb, kept, path);

  const q = renderQuestionByKey(kb, kept, key);
  if (!q) return null;
  const idx = path.indexOf(key);
  const progress = frontier.kind === "question" ? frontier.progress : 1;
  return {
    kind: "question",
    question: toClientQuestion(q),
    answer: kept[key],
    progress: Math.min(progress, path.length ? (idx + 1) / (path.length + 1) : 0),
    backKey: idx > 0 ? path[idx - 1] : undefined,
  };
}

export type ApplyResult =
  | { ok: true; answers: Answers; path: string[]; state: FlowState }
  | { ok: false; error: string; status: number };

/**
 * Apply an answer to the frontier question or to an earlier answered one.
 * Afterwards the user moves forward ONE step: to the next already-answered
 * question in their path (so editing doesn't skip ahead), or to the frontier.
 */
export function applyAnswer(
  kb: KnowledgeBase,
  answers: Answers,
  path: string[],
  key: string,
  input: AnswerInput,
): ApplyResult {
  const question = kb.questions.find((q) => q.key === key);
  if (!question) return { ok: false, error: "This question isn't available right now.", status: 409 };
  const kept = prune(kb, answers);
  const frontier = nextStep(kb, kept);
  const isFrontier = frontier.kind === "question" && frontier.question.key === key;
  const isEdit = has(kept, key);
  if (!isFrontier && !isEdit) return { ok: false, error: "This question isn't available right now.", status: 409 };

  const v = validateAnswer(question, input);
  if (!v.ok) return { ok: false, error: v.error, status: 422 };

  const nextAnswers = prune(kb, { ...kept, [key]: v.answer });
  const nextPath = cleanPath(path.includes(key) ? path : [...path, key], nextAnswers);

  const idx = nextPath.indexOf(key);
  const followingKey = nextPath[idx + 1];
  const view =
    (followingKey && questionView(kb, nextAnswers, nextPath, followingKey)) || frontierView(kb, nextAnswers, nextPath);

  return { ok: true, answers: nextAnswers, path: nextPath, state: { view, path: nextPath } };
}
