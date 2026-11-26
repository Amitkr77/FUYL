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

export function buildNutrients(kb: KnowledgeBase, answers: Answers): AssessmentResult["nutrients"] {
  const basis = nutrientBasis(answers);
  const pick = (v: { male: number; female: number }) => (basis === "adult" ? Math.max(v.male, v.female) : v[basis]);
  const rows: NutrientRow[] = kb.ingredients
    .filter((i) => i.nutrient)
    .map((i) => {
      const n = i.nutrient!;
      const india = pick(n.india);
      const global = pick(n.global);
      return {
        key: i.key,
        name: i.name,
        amount: n.amount,
        unit: n.unit,
        india,
        indiaPct: pct(n.amount, india),
        global,
        globalPct: pct(n.amount, global),
        ref: { india: n.india, global: n.global },
        kind: MINERALS.has(i.key) ? ("mineral" as const) : ("vitamin" as const),
      };
    });
  return rows.length ? { basis, rows } : undefined;
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
    const half = rows.filter((r) => r.indiaPct >= 50);
    const full = rows.filter((r) => r.indiaPct >= 100).map((r) => r.name.replace(/\s*\(.*\)$/, ""));
    points.push({
      kind: "nutrition",
      text: `One serve covers at least half of India's daily requirement (ICMR-NIN) for ${half.length} of ${rows.length} vitamins and minerals${full.length ? `, and all of it for ${joinNames(full)}` : ""}.`,
    });
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
