import { z } from "zod";
import type { Condition } from "@/engine";

/**
 * Strict schemas for every knowledge-base entity. All admin edits are
 * validated against these before they touch the draft, so a malformed
 * question can never reach the engine.
 */

/** Keys are used in URLs, Mongo field names and conditions: keep them simple. */
export const Key = z
  .string()
  .trim()
  .min(1, "Required")
  .max(60)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, - or _ (no spaces)");

/**
 * Option values are only ever stored as array items (answers, condition
 * lists) — never as field names — so they may also use + < > (e.g. "5+", "<4").
 */
export const OptionValue = z
  .string()
  .trim()
  .min(1, "Required")
  .max(40)
  .regex(/^[a-z0-9<>+][a-z0-9_+<>-]*$/, "Use lowercase letters, numbers, - _ + < > (no spaces)");

const Text = (max: number) => z.string().trim().max(max);
const Req = (max: number) => z.string().trim().min(1, "Required").max(max);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ConditionSchema).min(1) }).strict(),
    z.object({ any: z.array(ConditionSchema).min(1) }).strict(),
    z.object({ not: ConditionSchema }).strict(),
    z.object({ answer: Key, in: z.array(OptionValue).min(1) }).strict(),
    z.object({ answer: Key, notIn: z.array(OptionValue).min(1) }).strict(),
    z.object({ answered: Key }).strict(),
    z
      .object({ number: Key, gte: z.number().optional(), gt: z.number().optional(), lte: z.number().optional(), lt: z.number().optional() })
      .strict()
      .refine((c) => [c.gte, c.gt, c.lte, c.lt].some((v) => v !== undefined), "Set at least one bound"),
    z.object({ score: Key, gte: z.number() }).strict(),
    z.object({ flag: Key }).strict(),
  ]),
);

export const EffectSchema = z.object({ area: Key, weight: z.number().min(-20).max(20) }).strict();

export const OptionSchema = z
  .object({
    value: OptionValue,
    label: Req(120),
    info: Text(300).optional(),
    summary: z.union([Text(160), z.null()]).optional(),
    reason: Text(200).optional(),
    effects: z.array(EffectSchema).max(20).optional(),
    flags: z.array(Key).max(10).optional(),
    exclusive: z.boolean().optional(),
  })
  .strict();

export const BandSchema = z
  .object({
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    summary: z.union([Text(160), z.null()]).optional(),
    reason: Text(200).optional(),
    effects: z.array(EffectSchema).max(20).optional(),
    flags: z.array(Key).max(10).optional(),
  })
  .strict()
  .refine((b) => b.min === undefined || b.max === undefined || b.min <= b.max, "Min must be ≤ max");

export const QuestionSchema = z
  .object({
    key: Key,
    block: z.enum(["about", "lifestyle", "feel", "safety"]),
    order: z.number().int().min(0).max(999),
    type: z.enum(["single", "multi", "number", "text"]),
    tier: z.enum(["core", "followup"]),
    prompt: Req(240),
    why: Text(400).optional(),
    helper: Text(160).optional(),
    placeholder: Text(60).optional(),
    options: z.array(OptionSchema).max(30).optional(),
    maxSelect: z.number().int().min(1).max(30).optional(),
    scoreTop: z.number().int().min(1).max(30).optional(),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    unit: Text(20).optional(),
    bands: z.array(BandSchema).max(12).optional(),
    maxLength: z.number().int().min(1).max(200).optional(),
    showIf: ConditionSchema.optional(),
    summaryTemplate: Text(200).optional(),
    isPriorityQuestion: z.boolean().optional(),
    isNameQuestion: z.boolean().optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    const choice = q.type === "single" || q.type === "multi";
    if (choice && (!q.options || q.options.length < 2)) ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least two options" });
    if (choice && q.options && new Set(q.options.map((o) => o.value)).size !== q.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Option values must be unique" });
    }
    if (q.type === "single" && q.options?.some((o) => o.exclusive)) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "'Exclusive' only applies to multi-choice questions" });
    }
    if (q.type === "number" && q.min !== undefined && q.max !== undefined && q.min > q.max) {
      ctx.addIssue({ code: "custom", path: ["max"], message: "Max must be ≥ min" });
    }
    if (q.isNameQuestion && q.type !== "text") ctx.addIssue({ code: "custom", path: ["type"], message: "The name question must be a text question" });
    if (q.isPriorityQuestion && q.type !== "multi") ctx.addIssue({ code: "custom", path: ["type"], message: "The priorities question must be multi-choice" });
  });

export const AreaIngredientSchema = z.object({ key: Key, weight: z.number().min(0).max(10), why: Req(300) }).strict();

export const FocusAreaSchema = z
  .object({
    key: Key,
    name: Req(60),
    order: z.number().int().min(0).max(999),
    copy: Req(500),
    ingredients: z.array(AreaIngredientSchema).min(1).max(30),
    tips: z.array(Req(200)).max(10),
  })
  .strict()
  .refine((a) => new Set(a.ingredients.map((i) => i.key)).size === a.ingredients.length, "Each ingredient can be linked once");

export const IngredientSchema = z
  .object({
    key: Key,
    name: Req(80),
    blend: Text(80).optional(),
    dose: Text(40).optional(),
    blendDose: Text(40).optional(),
    rda: z.number().min(0).max(1000).optional(),
    category: Text(60).optional(),
    image: z.string().url().optional(),
    description: Text(400).optional(),
    nutrient: z
      .object({
        amount: z.number().positive().max(100_000),
        unit: Req(20),
        india: z.object({ male: z.number().positive(), female: z.number().positive() }).strict(),
        global: z.object({ male: z.number().positive(), female: z.number().positive() }).strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const SafetyRuleSchema = z
  .object({
    key: Key,
    level: z.enum(["info", "caution", "consult", "stop"]),
    when: ConditionSchema,
    title: Req(120),
    message: Req(600),
    ingredientKeys: z.array(Key).max(60),
  })
  .strict();

export const SettingsSchema = z
  .object({
    questionCap: z.number().int().min(5).max(100),
    topAreas: z.number().int().min(1).max(6),
    ingredientsPerArea: z.number().int().min(1).max(12),
    bands: z
      .object({ high: z.number().min(0).max(1), moderate: z.number().min(0).max(1) })
      .strict()
      .refine((b) => b.moderate < b.high, "Moderate must be below High"),
  })
  .strict();

export const KnowledgeBaseSchema = z
  .object({
    version: z.number().int().min(0),
    settings: SettingsSchema,
    questions: z.array(QuestionSchema),
    areas: z.array(FocusAreaSchema),
    ingredients: z.array(IngredientSchema),
    safetyRules: z.array(SafetyRuleSchema),
  })
  .strict();

export const ENTITY_TYPES = ["question", "area", "ingredient", "safety"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_SCHEMA = {
  question: QuestionSchema,
  area: FocusAreaSchema,
  ingredient: IngredientSchema,
  safety: SafetyRuleSchema,
} as const;

export const ENTITY_COLLECTION = {
  question: "questions",
  area: "areas",
  ingredient: "ingredients",
  safety: "safetyRules",
} as const;

export const ENTITY_LABEL: Record<EntityType, string> = {
  question: "Question",
  area: "Focus area",
  ingredient: "Ingredient",
  safety: "Safety rule",
};
