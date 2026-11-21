import type { Answers, Effect, EvalContext, KnowledgeBase, NumberBand, Option, Question } from "./types";

export function bandFor(q: Question, n: number | undefined): NumberBand | undefined {
  if (typeof n !== "number" || !q.bands) return undefined;
  return q.bands.find((b) => (b.min === undefined || n >= b.min) && (b.max === undefined || n <= b.max));
}

/** The options / band actually chosen for a question. */
export function selectedOptions(q: Question, answers: Answers): Option[] {
  const vals = answers[q.key]?.values ?? [];
  return (q.options ?? []).filter((o) => vals.includes(o.value));
}

/** Effects + flags contributed by one answered question. */
export function contributions(q: Question, answers: Answers): { effects: Effect[]; flags: string[] } {
  if (q.type === "number") {
    const band = bandFor(q, answers[q.key]?.number);
    return { effects: band?.effects ?? [], flags: band?.flags ?? [] };
  }
  const opts = selectedOptions(q, answers);
  return {
    effects: opts.flatMap((o) => o.effects ?? []),
    flags: opts.flatMap((o) => o.flags ?? []),
  };
}

/**
 * Build the evaluation context (scores + flags) from answers. Only questions
 * present in `answers` contribute; callers prune hidden answers first.
 */
export function buildContext(kb: KnowledgeBase, answers: Answers): EvalContext {
  const scores: Record<string, number> = {};
  const flags = new Set<string>();
  for (const q of kb.questions) {
    if (!answers[q.key]) continue;
    const { effects, flags: f } = contributions(q, answers);
    for (const e of effects) scores[e.area] = (scores[e.area] ?? 0) + e.weight;
    f.forEach((x) => flags.add(x));
  }
  return { answers, scores, flags };
}

/**
 * The best score each area could reach if the user picked the strongest
 * options everywhere. Used to turn raw scores into a 0–100 "match".
 * (An upper bound: it ignores branching, so real matches are conservative.)
 */
export function maxScores(kb: KnowledgeBase): Record<string, number> {
  const max: Record<string, number> = {};
  const add = (area: string, w: number) => (max[area] = (max[area] ?? 0) + w);

  for (const q of kb.questions) {
    const perArea: Record<string, number[]> = {};
    const push = (effects: Effect[] | undefined) => {
      const local: Record<string, number> = {};
      for (const e of effects ?? []) if (e.weight > 0) local[e.area] = (local[e.area] ?? 0) + e.weight;
      for (const [a, w] of Object.entries(local)) (perArea[a] ??= []).push(w);
    };
    if (q.type === "number") q.bands?.forEach((b) => push(b.effects));
    else q.options?.forEach((o) => push(o.effects));

    for (const [area, weights] of Object.entries(perArea)) {
      if (q.type === "multi") {
        const k = q.maxSelect ?? weights.length;
        const top = [...weights].sort((x, y) => y - x).slice(0, k);
        add(area, top.reduce((s, w) => s + w, 0));
      } else {
        add(area, Math.max(...weights));
      }
    }
  }
  return max;
}
