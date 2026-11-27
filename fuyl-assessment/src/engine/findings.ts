import { ageGroupOf, refForAge } from "./ages";
import { buildContext, maxScores } from "./scoring";
import type { Answers, AssessmentResult, BlendSummary, Finding, KnowledgeBase, NutrientRow, ResultArea } from "./types";

const MINERALS = new Set(["magnesium", "zinc", "iron", "selenium", "iodine", "manganese", "calcium", "copper", "chromium", "potassium"]);

/**
 * Report extras: the India-vs-global vitamin & mineral comparison and the
 * "summary of findings" shown first. Pure and deterministic, like the rest of
 * the engine — every sentence is assembled from reviewed KB text and numbers.
 */

const LEVEL_WORD = { high: "high", moderate: "moderate", mild: "mild" } as const;

/** The sex the comparison is based on: the answer to the `sex` question, else adult (higher of the two values). */
export function nutrientBasis(answers: Answers): "male" | "female" | "adult" {
  const v = answers.sex?.values?.[0];
  return v === "female" ? "female" : v === "male" ? "male" : "adult";
}

const pct = (amount: number, need: number) => (need > 0 ? Math.round((amount / need) * 100) : 0);

/** India's guidelines lead for people in India (or who didn't say); global ones for everyone else. */
export function primaryGuideline(answers: Answers): "india" | "global" {
  const c = answers.country?.values?.[0];
  return !c || c === "in" ? "india" : "global";
}

/**
 * Rough daily intake of each nutrient from the person's diet: servings a day
 * (from the "typical week" grid and fortified-food answers, plus everyday
 * cereals) × nutrients per serving. Undefined until the diet grid is answered.
 */
export function estimateIntake(kb: KnowledgeBase, answers: Answers): Record<string, number> | undefined {
  const foods = kb.foods ?? [];
  const gridQs = new Set(foods.map((f) => f.from.row && f.from.question).filter(Boolean) as string[]);
  if (!foods.length || [...gridQs].some((k) => !answers[k]?.grid)) return undefined;
  const total: Record<string, number> = {};
  for (const f of foods) {
    let perDay = 0;
    if (f.from.always !== undefined) perDay = f.from.always;
    else if (f.from.question) {
      const q = kb.questions.find((x) => x.key === f.from.question);
      const a = answers[f.from.question];
      if (q && a) {
        if (f.from.row) perDay = q.options?.find((o) => o.value === a.grid?.[f.from.row!])?.perDay ?? 0;
        else if (f.from.option) perDay = a.values?.includes(f.from.option) ? 1 : 0;
        else perDay = q.options?.find((o) => a.values?.includes(o.value))?.perDay ?? 0;
      }
    }
    if (perDay <= 0) continue;
    for (const [k, v] of Object.entries(f.nutrients)) total[k] = (total[k] ?? 0) + v * perDay;
  }
  return total;
}

export function buildNutrients(kb: KnowledgeBase, answers: Answers): AssessmentResult["nutrients"] {
  const basis = nutrientBasis(answers);
  const intake = estimateIntake(kb, answers);
  const estimable = new Set((kb.foods ?? []).flatMap((f) => Object.keys(f.nutrients)));
  const ageGroup = ageGroupOf(answers.age?.number);
  const pick = (v: { male: number; female: number }) => (basis === "adult" ? Math.max(v.male, v.female) : v[basis]);
  const rows: NutrientRow[] = kb.ingredients
    .filter((i) => i.nutrient)
    .map((i) => {
      const n = i.nutrient!;
      const forAge = refForAge(n, ageGroup);
      const india = pick(forAge.india);
      const global = pick(forAge.global);
      return {
        key: i.key,
        name: i.name,
        amount: n.amount,
        unit: n.unit,
        india,
        indiaPct: pct(n.amount, india),
        global,
        globalPct: pct(n.amount, global),
        ref: { india: n.india, global: n.global, ...(n.byAge ? { byAge: n.byAge } : {}) },
        kind: MINERALS.has(i.key) ? ("mineral" as const) : ("vitamin" as const),
        ...(intake && estimable.has(i.key) ? { diet: Math.round((intake[i.key] ?? 0) * 10) / 10 } : {}),
      };
    });
  return rows.length ? { basis, ageGroup, rows, primary: primaryGuideline(answers), dietEstimated: Boolean(intake) } : undefined;
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function buildFindings(input: {
  name?: string;
  areas: ResultArea[];
  safety: AssessmentResult["safety"];
  showProduct: boolean;
  ingredientCount: number;
  nutrients?: AssessmentResult["nutrients"];
  wellness?: AssessmentResult["wellness"];
}): NonNullable<AssessmentResult["findings"]> {
  const who = input.name ? `${input.name}, your` : "Your";
  const points: Finding[] = [];

  if (!input.showProduct) {
    const stop = input.safety.notes.find((n) => n.level === "stop");
    return {
      headline: `${who} answers show COMPLETE+ isn't the right fit right now.`,
      points: stop ? [{ kind: "safety", text: `${stop.title}. ${stop.message}` }] : [],
    };
  }

  const names = input.areas.map((a) => a.name);
  const headline = names.length
    ? `${who} top focus area${names.length === 1 ? " is" : "s are"} ${joinNames(names)}.`
    : `${who} answers didn't point to a specific focus area — COMPLETE+ covers everyday nutrition.`;

  if (input.wellness) {
    const sorted = [...input.wellness.pillars].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted.at(-1)!;
    points.push({
      kind: "wellness",
      text: `Overall wellness score: ${input.wellness.score}/100 (${input.wellness.label})${best && worst && best !== worst ? ` — strongest: ${best.name.toLowerCase()}; most room to improve: ${worst.name.toLowerCase()}` : ""}.`,
    });
  }

  for (const a of input.areas) {
    const why = a.reasons.slice(0, 2).map(lowerFirst);
    points.push({
      kind: "focus",
      text: `${a.name}: ${LEVEL_WORD[a.level]} match (${a.match}%)${a.isPriority ? ", one of your priorities" : ""}${why.length ? ` — ${joinNames(why)}` : ""}.`,
    });
  }

  const flagged = input.safety.notes.filter((n) => n.level === "consult" || n.level === "caution");
  points.push(
    flagged.length
      ? { kind: "safety", text: `Check with your doctor before starting: ${joinNames(flagged.map((n) => lowerFirst(n.title)))}.` }
      : { kind: "safety", text: "No safety concerns came up in your answers." },
  );

  if (input.nutrients?.rows.length) {
    const rows = input.nutrients.rows;
    const global = input.nutrients.primary === "global";
    const p = (r: NutrientRow) => (global ? r.globalPct : r.indiaPct);
    const need = (r: NutrientRow) => (global ? r.global : r.india);
    const half = rows.filter((r) => p(r) >= 50);
    const full = rows.filter((r) => p(r) >= 100).map((r) => r.name.replace(/\s*\(.*\)$/, ""));
    points.push({
      kind: "nutrition",
      text: `One serve covers at least half of ${global ? "the global" : "India's"} daily requirement (${global ? "US NIH" : "ICMR-NIN"}) for ${half.length} of ${rows.length} vitamins and minerals${full.length ? `, and all of it for ${joinNames(full)}` : ""}.`,
    });
    // Diet gap: the nutrients your meals fall shortest on, and what one serve adds.
    const withDiet = rows.filter((r) => r.diet !== undefined);
    if (withDiet.length) {
      const gaps = withDiet
        .map((r) => ({ r, dietPct: Math.round(((r.diet ?? 0) / need(r)) * 100) }))
        .filter((x) => x.dietPct < 100)
        .sort((a, b) => a.dietPct - b.dietPct)
        .slice(0, 2);
      if (gaps.length) {
        points.push({
          kind: "diet",
          text: `From your meals you get roughly ${joinNames(gaps.map((g) => `${g.dietPct}% of your daily ${g.r.name.replace(/\s*\(.*\)$/, "")}`))}; one serve adds ${joinNames(gaps.map((g) => `${p(g.r)}%`))} (estimated from your diet answers${gaps.some((g) => g.r.key === "vitamin-d3") ? "; sunlight also makes vitamin D" : ""}).`,
        });
      }
    }
  }

  if (input.ingredientCount > 0) {
    points.push({ kind: "ingredients", text: `${input.ingredientCount} ingredients in COMPLETE+ support your focus areas.` });
  }

  return { headline, points };
}

/** "2,600 mg" → 2600; anything not in mg (e.g. CFU) → undefined. */
export function doseMg(dose: string | undefined): number | undefined {
  const m = dose?.match(/^([\d,.]+)\s*mg$/i);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}

/** The formula grouped by blend (largest first), with the ingredients that support this person's focus areas. */
export function buildBlends(kb: KnowledgeBase, supporting: Set<string>): BlendSummary[] {
  const byBlend = new Map<string, { dose: string; names: string[]; forYou: string[] }>();
  for (const i of kb.ingredients) {
    if (!i.blend || i.blend === "Other Ingredients") continue;
    const dose = i.blendDose ?? (i.nutrient ? `${kb.ingredients.filter((x) => x.blend === i.blend).length} nutrients` : "");
    const b = byBlend.get(i.blend) ?? { dose, names: [], forYou: [] };
    b.names.push(i.name);
    if (supporting.has(i.key)) b.forYou.push(i.name);
    byBlend.set(i.blend, b);
  }
  return [...byBlend.entries()]
    .map(([name, b]) => ({ name, dose: b.dose, mg: doseMg(b.dose), total: b.names.length, forYou: b.forYou.length, forYouNames: b.forYou }))
    .sort((a, b) => (b.mg ?? -1) - (a.mg ?? -1) || b.total - a.total);
}

/** The six pillars: four read from area "need" (symptoms & habits), activity from its own answer. */
const PILLARS: { key: string; name: string; areas?: string[] }[] = [
  { key: "nutrition", name: "Nutrition", areas: ["nutrients"] },
  { key: "sleep", name: "Sleep", areas: ["sleep"] },
  { key: "mind", name: "Stress & mind", areas: ["stress", "focus"] },
  { key: "activity", name: "Activity" },
  { key: "digestion", name: "Digestion", areas: ["gut"] },
  { key: "immunity", name: "Immunity", areas: ["immunity"] },
];
const ACTIVITY_SCORE: Record<string, number> = { sitting: 35, light: 65, regular: 85, intense: 90 };
/** Need at or above this share of an area's maximum counts as a pillar score of 0. */
const NEED_FOR_ZERO = 0.7;

export function wellnessLabel(score: number): string {
  return score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs attention";
}

/**
 * Overall wellness score, 0–100 — higher means doing better (the opposite of
 * the focus-area "match"). Each pillar is 100 minus how strongly the person's
 * symptoms and habits point to that area; picking an area as a priority is a
 * goal, not a problem, so priorities don't lower the score.
 */
export function buildWellness(kb: KnowledgeBase, answers: Answers): AssessmentResult["wellness"] {
  const priorityQ = kb.questions.find((q) => q.isPriorityQuestion)?.key;
  const without = Object.fromEntries(Object.entries(answers).filter(([k]) => k !== priorityQ));
  const ctx = buildContext(kb, without);
  const max = maxScores({ ...kb, questions: kb.questions.filter((q) => q.key !== priorityQ) });
  const areaKeys = new Set(kb.areas.map((a) => a.key));
  const weights = kb.settings.wellness?.weights ?? {};

  const pillars: { key: string; name: string; score: number }[] = [];
  for (const p of PILLARS) {
    if (p.areas) {
      const present = p.areas.filter((a) => areaKeys.has(a) && max[a]);
      if (!present.length) continue;
      const need = present.reduce((s, a) => s + Math.min(1, (ctx.scores[a] ?? 0) / max[a]), 0) / present.length;
      pillars.push({ key: p.key, name: p.name, score: Math.round(100 * (1 - Math.min(1, need / NEED_FOR_ZERO))) });
    } else {
      const v = answers.activity?.values?.[0];
      if (v && ACTIVITY_SCORE[v] !== undefined) pillars.push({ key: p.key, name: p.name, score: ACTIVITY_SCORE[v] });
    }
  }
  if (!pillars.length) return undefined;
  const w = (k: string) => weights[k] ?? 1;
  const totalW = pillars.reduce((s, p) => s + w(p.key), 0);
  const score = Math.round(pillars.reduce((s, p) => s + p.score * w(p.key), 0) / (totalW || 1));
  return { score, label: wellnessLabel(score), pillars };
}
