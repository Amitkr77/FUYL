import { prune } from "./flow";
import { buildBlends, buildFindings, buildNutrients, buildWellness } from "./findings";
import { evaluateSafety } from "./safety";
import { bandFor, buildContext, maxScores } from "./scoring";
import { buildSummary } from "./summary";
import { firstName } from "./text";
import type {
  AreaLevel,
  Answers,
  AssessmentResult,
  KnowledgeBase,
  ResultArea,
  ResultIngredient,
} from "./types";

/** Areas the user explicitly picked in the priorities question, in KB option order. */
export function priorityAreas(kb: KnowledgeBase, answers: Answers): string[] {
  const q = kb.questions.find((x) => x.isPriorityQuestion);
  if (!q) return [];
  const picked = answers[q.key]?.values ?? [];
  return (q.options ?? [])
    .filter((o) => picked.includes(o.value))
    .flatMap((o) => (o.effects ?? []).filter((e) => e.weight > 0).map((e) => e.area));
}

/**
 * Personal reasons for an area: the `reason` phrases of answers that pushed
 * this area up, strongest contribution first, de-duplicated.
 */
function reasonsFor(kb: KnowledgeBase, answers: Answers, area: string, limit = 3): string[] {
  const scored: { text: string; weight: number }[] = [];
  for (const q of kb.questions) {
    if (!answers[q.key] || q.isPriorityQuestion) continue;
    const pick = (reason: string | undefined, effects: { area: string; weight: number }[] | undefined) => {
      const w = (effects ?? []).filter((e) => e.area === area).reduce((s, e) => s + e.weight, 0);
      if (reason && w > 0) scored.push({ text: reason, weight: w });
    };
    if (q.type === "number") {
      const band = bandFor(q, answers[q.key]?.number);
      pick(band?.reason, band?.effects);
    } else if (q.type === "grid") {
      const g = answers[q.key]?.grid ?? {};
      for (const r of q.rows ?? []) if (g[r.key]) pick(r.reasons?.[g[r.key]], r.effects?.[g[r.key]]);
    } else {
      const vals = answers[q.key]?.values ?? [];
      for (const o of q.options ?? []) if (vals.includes(o.value)) pick(o.reason, o.effects);
    }
  }
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.weight - a.weight)
    .map((s) => s.text)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, limit);
}

function levelFor(fraction: number, bands: { high: number; moderate: number }): AreaLevel {
  if (fraction >= bands.high) return "high";
  if (fraction >= bands.moderate) return "moderate";
  return "mild";
}

/**
 * Build the full result from answers. Deterministic: same KB + answers ⇒ same
 * result. Hidden answers are pruned first so stale branches can't leak in.
 */
export function buildResult(kb: KnowledgeBase, rawAnswers: Answers): AssessmentResult {
  const answers = prune(kb, rawAnswers);
  const ctx = buildContext(kb, answers);
  const max = maxScores(kb);
  const priorities = priorityAreas(kb, answers);
  const safety = evaluateSafety(kb, ctx);
  const ingByKey = new Map(kb.ingredients.map((i) => [i.key, i]));

  // Rank: user-picked priorities first, then everything else — each group by
  // match (share of the area's maximum), which is the % the user sees, so the
  // order always agrees with the numbers on screen. Ties: raw score, then KB order.
  const all = kb.areas.map((a) => {
    const score = ctx.scores[a.key] ?? 0;
    return { area: a, score, fraction: max[a.key] ? Math.min(1, score / max[a.key]) : 0, isPriority: priorities.includes(a.key) };
  });
  const ranked = kb.areas
    .map((a) => {
      const score = ctx.scores[a.key] ?? 0;
      const fraction = max[a.key] ? Math.min(1, score / max[a.key]) : 0;
      return { area: a, score, fraction, isPriority: priorities.includes(a.key) };
    })
    .filter((x) => x.score > 0)
    .sort(
      (x, y) =>
        Number(y.isPriority) - Number(x.isPriority) ||
        y.fraction - x.fraction ||
        y.score - x.score ||
        x.area.order - y.area.order,
    )
    // Every area the user picked as a priority is shown, even beyond topAreas.
    .slice(0, Math.max(kb.settings.topAreas, new Set(priorities).size));

  // Each ingredient is listed once, under the highest-ranked area that links
  // it — but no area is left looking thin: if it has fewer than
  // MIN_PER_AREA fresh ingredients, it's topped up with its strongest
  // already-listed ones, marked `sharedWith` (e.g. "Also in Stress").
  const MIN_PER_AREA = Math.min(3, kb.settings.ingredientsPerArea);
  const firstShownIn = new Map<string, string>(); // ingredient key → area name
  const areas: ResultArea[] = ranked.map(({ area, fraction, isPriority }) => {
    const linked = [...area.ingredients].sort((a, b) => b.weight - a.weight).filter((ai) => ingByKey.has(ai.key));
    const fresh = linked.filter((ai) => !firstShownIn.has(ai.key)).slice(0, kb.settings.ingredientsPerArea);
    const topUp = linked.filter((ai) => firstShownIn.has(ai.key)).slice(0, Math.max(0, MIN_PER_AREA - fresh.length));
    const ingredients: ResultIngredient[] = [
      ...fresh.map((ai) => ({ ...ingByKey.get(ai.key)!, why: ai.why })),
      ...topUp.map((ai) => ({ ...ingByKey.get(ai.key)!, why: ai.why, sharedWith: firstShownIn.get(ai.key) })),
    ];
    for (const ai of fresh) firstShownIn.set(ai.key, area.name);
    return {
      key: area.key,
      name: area.name,
      copy: area.copy,
      level: levelFor(fraction, kb.settings.bands),
      match: Math.round(fraction * 100),
      reasons: reasonsFor(kb, answers, area.key),
      ingredients,
      tips: area.tips.slice(0, 2),
      isPriority,
    };
  });

  // Coverage counts every distinct ingredient supporting the shown areas
  // (not just the ones listed), which is what "covers N of your needs" means.
  const supporting = new Set(
    ranked.flatMap(({ area }) => area.ingredients.map((i) => i.key).filter((k) => ingByKey.has(k))),
  );


  const name = firstName(kb, answers);
  const showProduct = safety.level !== "stop";
  const nutrients = buildNutrients(kb, answers);
  const wellness = showProduct ? buildWellness(kb, answers) : undefined;
  const shownKeys = new Set(areas.map((a) => a.key));
  const profile = all
    .sort((x, y) => x.area.order - y.area.order)
    .map(({ area, fraction, isPriority }) => ({ key: area.key, name: area.name, match: Math.round(fraction * 100), shown: shownKeys.has(area.key), isPriority }));
  return {
    kbVersion: kb.version,
    name,
    profile,
    blends: buildBlends(kb, supporting),
    findings: buildFindings({ name, areas, safety, showProduct, ingredientCount: supporting.size, nutrients, wellness }),
    wellness,
    nutrients,
    summary: buildSummary(kb, answers),
    areas,
    safety,
    showProduct,
    coverage: { areaCount: areas.length, ingredientCount: supporting.size },
  };
}
