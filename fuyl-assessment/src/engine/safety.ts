import { evaluate } from "./conditions";
import { SAFETY_RANK, type EvalContext, type KnowledgeBase, type SafetyLevel, type SafetyNote } from "./types";

/**
 * Every triggered safety rule, most severe first. The overall level is the
 * most severe one ("stop" > "consult" > "caution" > "info").
 */
export function evaluateSafety(kb: KnowledgeBase, ctx: EvalContext): { level: SafetyLevel | "none"; notes: SafetyNote[] } {
  const names = new Map(kb.ingredients.map((i) => [i.key, i.name]));
  const notes: SafetyNote[] = kb.safetyRules
    .filter((r) => evaluate(r.when, ctx))
    .map((r) => ({
      key: r.key,
      level: r.level,
      title: r.title,
      message: r.message,
      ingredients: r.ingredientKeys.map((k) => names.get(k)).filter((n): n is string => Boolean(n)),
    }))
    .sort((a, b) => SAFETY_RANK[b.level] - SAFETY_RANK[a.level]);

  return { level: notes[0]?.level ?? "none", notes };
}
