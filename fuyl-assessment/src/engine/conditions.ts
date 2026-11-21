import type { Answer, Condition, EvalContext } from "./types";

function hasAnswer(a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.values && a.values.length > 0) return true;
  if (typeof a.number === "number" && Number.isFinite(a.number)) return true;
  if (typeof a.text === "string" && a.text.trim().length > 0) return true;
  return false;
}

/** Evaluate a (possibly nested) condition against the current state. */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (!cond) return true;

  if ("all" in cond) return cond.all.every((c) => evaluate(c, ctx));
  if ("any" in cond) return cond.any.some((c) => evaluate(c, ctx));
  if ("not" in cond) return !evaluate(cond.not, ctx);

  if ("answered" in cond) return hasAnswer(ctx.answers[cond.answered]);

  if ("answer" in cond) {
    const vals = ctx.answers[cond.answer]?.values ?? [];
    if ("in" in cond) return vals.some((v) => cond.in.includes(v));
    // notIn: must be answered, and contain none of the values
    return vals.length > 0 && !vals.some((v) => cond.notIn.includes(v));
  }

  if ("number" in cond) {
    const n = ctx.answers[cond.number]?.number;
    if (typeof n !== "number" || !Number.isFinite(n)) return false;
    if (cond.gte !== undefined && !(n >= cond.gte)) return false;
    if (cond.gt !== undefined && !(n > cond.gt)) return false;
    if (cond.lte !== undefined && !(n <= cond.lte)) return false;
    if (cond.lt !== undefined && !(n < cond.lt)) return false;
    return true;
  }

  if ("score" in cond) return (ctx.scores[cond.score] ?? 0) >= cond.gte;

  if ("flag" in cond) return ctx.flags.has(cond.flag);

  return false;
}

/** Every question key a condition refers to — used by the KB checker. */
export function referencedQuestions(cond: Condition | undefined, out = new Set<string>()): Set<string> {
  if (!cond) return out;
  if ("all" in cond) cond.all.forEach((c) => referencedQuestions(c, out));
  else if ("any" in cond) cond.any.forEach((c) => referencedQuestions(c, out));
  else if ("not" in cond) referencedQuestions(cond.not, out);
  else if ("answered" in cond) out.add(cond.answered);
  else if ("answer" in cond) out.add(cond.answer);
  else if ("number" in cond) out.add(cond.number);
  return out;
}

/** Every flag / area key a condition refers to — used by the KB checker. */
export function referencedSignals(
  cond: Condition | undefined,
  out = { flags: new Set<string>(), areas: new Set<string>() },
) {
  if (!cond) return out;
  if ("all" in cond) cond.all.forEach((c) => referencedSignals(c, out));
  else if ("any" in cond) cond.any.forEach((c) => referencedSignals(c, out));
  else if ("not" in cond) referencedSignals(cond.not, out);
  else if ("flag" in cond) out.flags.add(cond.flag);
  else if ("score" in cond) out.areas.add(cond.score);
  return out;
}
