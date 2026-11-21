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

export { AREAS, INGREDIENTS, QUESTIONS, SAFETY_RULES };
