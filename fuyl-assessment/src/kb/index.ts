import type { EngineSettings, KnowledgeBase } from "@/engine";
import { AREAS } from "./areas";
import { INGREDIENTS } from "./ingredients";
import { QUESTIONS } from "./questions";
import { SAFETY_RULES } from "./safety";

export const DEFAULT_SETTINGS: EngineSettings = {
  // Follow-ups stop once this many questions are answered; core questions
  // (basics, gates, safety) are always asked.
  questionCap: 30,
  topAreas: 3,
  ingredientsPerArea: 5,
  bands: { high: 0.5, moderate: 0.25 },
};

/**
 * The drafted knowledge base (version 1). Seeded into the database as the
 * first draft; after that, the admin is the source of truth.
 */
export function seedKnowledgeBase(): KnowledgeBase {
  return {
    version: 1,
    settings: DEFAULT_SETTINGS,
    questions: QUESTIONS,
    areas: AREAS,
    ingredients: INGREDIENTS,
    safetyRules: SAFETY_RULES,
  };
}

/**
 * TEMPORARY fallback (until a version with reference values is reviewed and
 * published): fill in the built-in India/global daily reference values for any
 * vitamin or mineral the knowledge base doesn't have them for. Values set in
 * the admin always win — this only fills gaps.
 */
const BUILT_IN_REFS = new Map(INGREDIENTS.filter((i) => i.nutrient).map((i) => [i.key, i.nutrient!]));

export function withReferenceDefaults(kb: KnowledgeBase): KnowledgeBase {
  if (kb.ingredients.every((i) => i.nutrient || !BUILT_IN_REFS.has(i.key))) return kb;
  return { ...kb, ingredients: kb.ingredients.map((i) => (i.nutrient || !BUILT_IN_REFS.has(i.key) ? i : { ...i, nutrient: BUILT_IN_REFS.get(i.key) })) };
}

export { AREAS, INGREDIENTS, QUESTIONS, SAFETY_RULES };
