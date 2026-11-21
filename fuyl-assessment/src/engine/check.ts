import { referencedQuestions, referencedSignals } from "./conditions";
import { nextStep, orderedQuestions, triggeredStop } from "./flow";
import type { Answer, Answers, KnowledgeBase, Question } from "./types";

export interface CheckIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  ref?: string;
}

/**
 * Static + simulated integrity checks for a knowledge base. Errors block
 * publishing in the admin; warnings are shown for review.
 */
export function checkKnowledgeBase(kb: KnowledgeBase): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const err = (code: string, message: string, ref?: string) => issues.push({ severity: "error", code, message, ref });
  const warn = (code: string, message: string, ref?: string) => issues.push({ severity: "warning", code, message, ref });

  const qKeys = new Set<string>();
  const order = orderedQuestions(kb);
  const position = new Map(order.map((q, i) => [q.key, i]));
  const areaKeys = new Set(kb.areas.map((a) => a.key));
  const ingKeys = new Set(kb.ingredients.map((i) => i.key));
  const flagsRaised = new Set<string>();
  const areasRaised = new Set<string>();

  // ── Questions ──
  for (const q of kb.questions) {
    if (qKeys.has(q.key)) err("duplicate_question", `Duplicate question key "${q.key}".`, q.key);
    qKeys.add(q.key);

    if ((q.type === "single" || q.type === "multi") && (!q.options || q.options.length < 2)) {
      err("too_few_options", `"${q.key}" needs at least two options.`, q.key);
    }
    const vals = new Set<string>();
    for (const o of q.options ?? []) {
      if (vals.has(o.value)) err("duplicate_option", `"${q.key}" has duplicate option "${o.value}".`, q.key);
      vals.add(o.value);
      for (const e of o.effects ?? []) {
        if (!areaKeys.has(e.area)) err("unknown_area", `"${q.key}" → "${o.value}" scores unknown focus area "${e.area}".`, q.key);
        areasRaised.add(e.area);
      }
      (o.flags ?? []).forEach((f) => flagsRaised.add(f));
    }
    for (const b of q.bands ?? []) {
      for (const e of b.effects ?? []) {
        if (!areaKeys.has(e.area)) err("unknown_area", `"${q.key}" band scores unknown focus area "${e.area}".`, q.key);
        areasRaised.add(e.area);
      }
      (b.flags ?? []).forEach((f) => flagsRaised.add(f));
    }
    if (q.type === "multi" && q.maxSelect && q.maxSelect < 1) err("bad_max_select", `"${q.key}" maxSelect must be ≥ 1.`, q.key);
  }

  if (kb.questions.filter((q) => q.isPriorityQuestion).length > 1) err("multiple_priority", "Only one question can be the priorities question.");
  if (kb.questions.filter((q) => q.isNameQuestion).length > 1) err("multiple_name", "Only one question can be the name question.");

  // ── Conditions must reference earlier questions that exist ──
  for (const q of kb.questions) {
    for (const ref of referencedQuestions(q.showIf)) {
      if (!qKeys.has(ref)) err("unknown_reference", `"${q.key}" depends on unknown question "${ref}".`, q.key);
      else if ((position.get(ref) ?? 0) >= (position.get(q.key) ?? 0)) {
        err("forward_reference", `"${q.key}" depends on "${ref}", which is asked later — move it earlier.`, q.key);
      }
    }
    const sig = referencedSignals(q.showIf);
    sig.flags.forEach((f) => !flagsRaised.has(f) && warn("unused_flag_ref", `"${q.key}" checks flag "${f}" that no answer raises.`, q.key));
    sig.areas.forEach((a) => !areaKeys.has(a) && err("unknown_area", `"${q.key}" checks unknown focus area "${a}".`, q.key));
  }

  // ── Focus areas ──
  for (const a of kb.areas) {
    if (a.ingredients.length === 0) err("area_no_ingredients", `Focus area "${a.name}" has no ingredients.`, a.key);
    for (const i of a.ingredients) {
      if (!ingKeys.has(i.key)) err("unknown_ingredient", `Focus area "${a.name}" links unknown ingredient "${i.key}".`, a.key);
      if (!i.why.trim()) warn("missing_why", `Focus area "${a.name}" → "${i.key}" has no explanation.`, a.key);
    }
    if (!areasRaised.has(a.key)) err("unreachable_area", `No answer ever scores focus area "${a.name}".`, a.key);
  }

  // ── Safety rules ──
  for (const r of kb.safetyRules) {
    for (const k of r.ingredientKeys) if (!ingKeys.has(k)) err("unknown_ingredient", `Safety rule "${r.key}" names unknown ingredient "${k}".`, r.key);
    for (const ref of referencedQuestions(r.when)) if (!qKeys.has(ref)) err("unknown_reference", `Safety rule "${r.key}" depends on unknown question "${ref}".`, r.key);
    referencedSignals(r.when).flags.forEach(
      (f) => !flagsRaised.has(f) && err("unreachable_rule", `Safety rule "${r.key}" checks flag "${f}" that no answer raises.`, r.key),
    );
  }

  // ── Simulation: reachability + path length ──
  const reached = simulateReachable(kb);
  for (const q of kb.questions) if (!reached.seen.has(q.key)) err("unreachable_question", `Question "${q.key}" can never be reached.`, q.key);
  if (reached.maxLength > kb.settings.questionCap + kb.questions.filter((q) => q.tier === "core").length) {
    warn("long_path", `Longest path is ${reached.maxLength} questions.`);
  }

  return issues;
}

/**
 * Coverage walks: find every question that can be shown, and the longest
 * path, without exploring the full combinatorial answer space.
 *
 * Two baseline walks (always pick the first / the last sample answer that
 * doesn't trigger a stop rule), then — for every sample answer of every
 * question — the same two walks with just that one answer forced. Branches
 * that open on a single answer (the common case: "diet = vegan", "age ≥ 40",
 * "activity = intense") are therefore always explored, in ~2 × (total
 * options) walks.
 */
export function simulateReachable(kb: KnowledgeBase): { seen: Set<string>; maxLength: number } {
  const seen = new Set<string>();
  let maxLength = 0;
  const samples = new Map(kb.questions.map((q) => [q.key, sampleAnswers(q)]));

  const walk = (base: "first" | "last", forced?: { key: string; answer: Answer }) => {
    const answers: Answers = {};
    for (let i = 0; i < kb.questions.length + 1; i++) {
      const step = nextStep(kb, answers);
      if (step.kind !== "question") break;
      const key = step.question.key;
      seen.add(key);
      if (forced && forced.key === key) {
        answers[key] = forced.answer;
        continue;
      }
      const options = samples.get(key) ?? [];
      const ordered = base === "first" ? options : [...options].reverse();
      // Prefer an answer that keeps the walk going (doesn't trigger a stop rule).
      answers[key] = ordered.find((a) => !triggeredStop(kb, { ...answers, [key]: a })) ?? ordered[0];
    }
    maxLength = Math.max(maxLength, Object.keys(answers).length);
  };

  for (const base of ["first", "last"] as const) {
    walk(base);
    for (const q of kb.questions) for (const answer of samples.get(q.key) ?? []) walk(base, { key: q.key, answer });
  }
  return { seen, maxLength };
}

function sampleAnswers(q: Question) {
  switch (q.type) {
    case "text":
      return [{ text: "Sam" }];
    case "number": {
      const points = new Set<number>();
      for (const b of q.bands ?? []) {
        if (b.min !== undefined) points.add(b.min);
        if (b.max !== undefined) points.add(b.max);
      }
      if (points.size === 0) points.add(q.min ?? 30);
      return [...points].map((n) => ({ number: n }));
    }
    case "single":
      return (q.options ?? []).map((o) => ({ values: [o.value] }));
    case "multi": {
      const opts = q.options ?? [];
      const singles = opts.map((o) => ({ values: [o.value] }));
      const combo = opts.filter((o) => !o.exclusive).slice(0, q.maxSelect ?? opts.length).map((o) => o.value);
      return combo.length > 1 ? [...singles, { values: combo }] : singles;
    }
  }
}
