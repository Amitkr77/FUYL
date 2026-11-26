/**
 * Assessment engine — shared types.
 *
 * The engine is a set of PURE functions over a KnowledgeBase and the user's
 * answers. No I/O, no randomness, no clock: the same KB + answers always
 * produce the same next question and the same result. That makes it fully
 * unit-testable and lets every result be traced back to reviewed KB entries.
 */

export type BlockKey = "about" | "lifestyle" | "feel" | "safety";

export const BLOCK_ORDER: BlockKey[] = ["about", "lifestyle", "feel", "safety"];

// ─── Conditions (admin-editable, JSON-serialisable) ─────────────────────────

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  /** True if the question has an answer containing ANY of these option values. */
  | { answer: string; in: string[] }
  /** True if the question is answered and contains NONE of these values. */
  | { answer: string; notIn: string[] }
  /** True if the question has been answered (not skipped / not hidden). */
  | { answered: string }
  /** Numeric comparison on a `number` question. All given bounds must hold. */
  | { number: string; gte?: number; gt?: number; lte?: number; lt?: number }
  /** Running focus-area score comparison. */
  | { score: string; gte: number }
  /** True if any answer so far has raised this flag. */
  | { flag: string };

// ─── Knowledge base ─────────────────────────────────────────────────────────

export interface Effect {
  /** Focus-area key, e.g. "energy". */
  area: string;
  weight: number;
}

export interface Option {
  value: string;
  label: string;
  /** Short explainer shown behind an ⓘ on the option tile. */
  info?: string;
  /** Phrase used in the profile summary. `null` = leave this answer out of the summary. */
  summary?: string | null;
  /** Personal reason shown under a focus area ("You said you hit an afternoon slump"). */
  reason?: string;
  effects?: Effect[];
  flags?: string[];
  /** Selecting this clears every other selection (e.g. "None of these"). */
  exclusive?: boolean;
  /** Short "Did you know?" line shown right after this answer (reviewed, claim-safe). */
  insight?: string;
}

/** For `number` questions: effects/flags keyed by value range (inclusive bounds). */
export interface NumberBand {
  min?: number;
  max?: number;
  summary?: string | null;
  reason?: string;
  effects?: Effect[];
  flags?: string[];
}

export type QuestionType = "single" | "multi" | "number" | "text";

export interface Question {
  key: string;
  block: BlockKey;
  /** Order within the block. */
  order: number;
  type: QuestionType;
  /** Supports {name} templating. */
  prompt: string;
  /** "Why we ask?" copy. */
  why?: string;
  helper?: string;
  placeholder?: string;
  options?: Option[];
  /** multi only: maximum selections (leave empty to allow any number). */
  maxSelect?: number;
  /**
   * multi only: how many of the strongest picks count toward an area's maximum
   * score. Lets people pick as many options as they like without shrinking
   * everyone's match %. Defaults to maxSelect, else all options.
   */
  scoreTop?: number;
  /** number only */
  min?: number;
  max?: number;
  unit?: string;
  bands?: NumberBand[];
  /** text only */
  maxLength?: number;
  showIf?: Condition;
  /**
   * Follow-up questions count toward the question cap and are dropped once it
   * is reached. Core questions (basics, gates, safety) are always asked.
   */
  tier: "core" | "followup";
  /** Profile-summary line, e.g. "You usually sleep {answer}." Omit to exclude. */
  summaryTemplate?: string;
  /** Marks the "top priorities" question — its picks are guaranteed a place in the result. */
  isPriorityQuestion?: boolean;
  /** Marks the name question — its text answer personalises copy. */
  isNameQuestion?: boolean;
}

export interface AreaIngredient {
  /** Ingredient key (see Ingredient.key). */
  key: string;
  weight: number;
  /** Claim-safe, reviewed line: why this ingredient is relevant to the area. */
  why: string;
}

export interface FocusArea {
  key: string;
  name: string;
  /** Short, claim-safe description shown on the result card. */
  copy: string;
  ingredients: AreaIngredient[];
  tips: string[];
  order: number;
}

export interface Ingredient {
  key: string;
  name: string;
  /** Blend it belongs to, e.g. "Adaptogen & Cognitive Blend". */
  blend?: string;
  /** Dose for this ingredient (vitamins/minerals) e.g. "2.2 mcg". */
  dose?: string;
  /** Blend total for botanicals, e.g. "400 mg". */
  blendDose?: string;
  /** % of daily RDA per serve, e.g. 100. */
  rda?: number;
  category?: string;
  image?: string;
  description?: string;
  /** Vitamins & minerals: amount per serve and daily reference values (India + global) for the comparison. */
  nutrient?: NutrientRef;
}

/** Daily reference intake for adults, by sex. */
export interface SexValues {
  male: number;
  female: number;
}

export interface NutrientRef {
  /** Amount per serve, in `unit` (matches the label dose). */
  amount: number;
  unit: string;
  /** India: ICMR-NIN 2020 RDA/AI for adults (sedentary). */
  india: SexValues;
  /** Global: US National Institutes of Health RDA/AI for adults (19–50). */
  global: SexValues;
}

export type SafetyLevel = "info" | "caution" | "consult" | "stop";

export const SAFETY_RANK: Record<SafetyLevel | "none", number> = {
  none: 0,
  info: 1,
  caution: 2,
  consult: 3,
  stop: 4,
};

export interface SafetyRule {
  key: string;
  level: SafetyLevel;
  when: Condition;
  title: string;
  message: string;
  ingredientKeys: string[];
}

export interface EngineSettings {
  /** Max number of answered questions before follow-ups stop being asked. */
  questionCap: number;
  /** How many focus areas to show on the result. */
  topAreas: number;
  /** Max ingredients listed per focus area. */
  ingredientsPerArea: number;
  /** Fraction-of-max thresholds for High / Moderate (anything > 0 below that is Mild). */
  bands: { high: number; moderate: number };
}

export interface KnowledgeBase {
  version: number;
  settings: EngineSettings;
  questions: Question[];
  areas: FocusArea[];
  ingredients: Ingredient[];
  safetyRules: SafetyRule[];
}

// ─── Answers & state ────────────────────────────────────────────────────────

export interface Answer {
  values?: string[]; // single / multi
  number?: number; // number
  text?: string; // text
}

export type Answers = Record<string, Answer>;

export interface EvalContext {
  answers: Answers;
  scores: Record<string, number>;
  flags: Set<string>;
}

// ─── Engine outputs ─────────────────────────────────────────────────────────

export interface RenderedQuestion extends Omit<Question, "prompt" | "why" | "bands"> {
  prompt: string;
  why?: string;
}

export type NextStep =
  /** `remaining`: visible questions still to come after this one (an estimate — branches can open). */
  | { kind: "question"; question: RenderedQuestion; progress: number; answeredCount: number; remaining: number }
  | { kind: "stopped"; rule: Pick<SafetyRule, "key" | "title" | "message"> }
  | { kind: "complete" };

export interface SummaryLine {
  block: BlockKey;
  questionKey: string;
  text: string;
}

export type AreaLevel = "high" | "moderate" | "mild";

export interface ResultIngredient extends Ingredient {
  why: string;
  /** Set when this ingredient was already listed under a higher-ranked area (its name). */
  sharedWith?: string;
}

export interface ResultArea {
  key: string;
  name: string;
  copy: string;
  level: AreaLevel;
  /** 0–100, share of the maximum reachable score. */
  match: number;
  reasons: string[];
  ingredients: ResultIngredient[];
  tips: string[];
  isPriority: boolean;
}

export interface SafetyNote {
  key: string;
  level: SafetyLevel;
  title: string;
  message: string;
  ingredients: string[];
}

/** One vitamin/mineral row of the India-vs-global comparison, for this user's sex. */
export interface NutrientRow {
  key: string;
  name: string;
  amount: number;
  unit: string;
  india: number;
  indiaPct: number;
  global: number;
  globalPct: number;
  /** Both sexes' requirements, for the Women / Men / Both switch on the report. */
  ref?: { india: SexValues; global: SexValues };
  kind?: "vitamin" | "mineral";
}

/** Match for every focus area (for the profile chart), not just the ones shown. */
export interface ProfileArea {
  key: string;
  name: string;
  /** 0–100 */
  match: number;
  shown: boolean;
  isPriority: boolean;
}

/** One blend of the formula, with how many of its ingredients support this person's focus areas. */
export interface BlendSummary {
  name: string;
  /** As printed on the label, e.g. "2,600 mg" or "2 billion CFU". */
  dose: string;
  /** Milligrams when the dose is in mg (for the bar), else undefined. */
  mg?: number;
  total: number;
  forYou: number;
  forYouNames: string[];
}

export interface Finding {
  kind: "focus" | "safety" | "nutrition" | "ingredients";
  text: string;
}

export interface AssessmentResult {
  kbVersion: number;
  name?: string;
  /** Summary of findings shown first on the report (absent on reports created before it existed). */
  findings?: { headline: string; points: Finding[] };
  /** Vitamin & mineral comparison: per serve vs daily needs in India and globally. */
  nutrients?: { basis: "male" | "female" | "adult"; rows: NutrientRow[] };
  /** Every focus area's match, for the profile chart. */
  profile?: ProfileArea[];
  /** The formula by blend, with the ingredients matched to this person. */
  blends?: BlendSummary[];
  summary: SummaryLine[];
  areas: ResultArea[];
  safety: { level: SafetyLevel | "none"; notes: SafetyNote[] };
  /** False when a stop rule fired — no product CTA. */
  showProduct: boolean;
  coverage: { areaCount: number; ingredientCount: number };
}
