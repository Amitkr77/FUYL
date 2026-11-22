import { z } from "zod";

/**
 * Assisted assessment (chat) settings, edited in /admin → Assisted assessment.
 * They apply to chats started after a save; a running chat keeps the snapshot
 * it started with.
 */
export const AssistedSettingsSchema = z.object({
  /** Show "Assisted assessment" on the welcome screen. */
  enabled: z.boolean(),
  /**
   * hybrid — the rules engine picks every question; AI only understands replies.
   * full   — AI leads the conversation (order, follow-ups); the engine still
   *          validates every answer, applies safety and builds the result.
   */
  mode: z.enum(["hybrid", "full"]),
  /** text — free text only; chips — free text plus tap-to-answer suggestions. */
  input: z.enum(["text", "chips"]),
  /** builtin — no external AI; groq — Groq's API (needs GROQ_API_KEY). */
  provider: z.enum(["builtin", "groq"]),
  model: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._/-]{1,80}$/, "Use the model id exactly as Groq lists it."),
  /** Max AI requests per UTC day (keeps usage inside the free tier). Above it, chats continue on built-in understanding. */
  dailyAiCap: z.number().int().min(0).max(1_000_000),
});

export type AssistedSettings = z.infer<typeof AssistedSettingsSchema>;

export const DEFAULT_ASSISTED_SETTINGS: AssistedSettings = {
  enabled: true,
  mode: "hybrid",
  input: "chips",
  provider: "groq",
  model: "openai/gpt-oss-120b",
  dailyAiCap: 900,
};

/** Full-AI mode needs a real AI provider; with the built-in one the chat runs as hybrid. */
export const effectiveMode = (s: Pick<AssistedSettings, "mode" | "provider">) => (s.provider === "builtin" ? "hybrid" : s.mode);
