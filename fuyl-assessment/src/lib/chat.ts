import "server-only";
import { effectiveMode, type AssistedSettings } from "@/chat/settings";
import type { AiPort } from "@/chat/ai";
import { env } from "@/lib/env";
import { groqPort } from "@/lib/groq";
import { recordAiUsage, reserveAiCall } from "@/lib/assisted";

/** Settings an Assisted assessment runs with (snapshot taken at start). */
export type ChatSettings = Pick<AssistedSettings, "mode" | "input" | "provider" | "model" | "dailyAiCap">;

export function snapshot(s: AssistedSettings): ChatSettings {
  return { mode: effectiveMode(s), input: s.input, provider: s.provider, model: s.model, dailyAiCap: s.dailyAiCap };
}

/** The AI port for an assessment, or null for built-in understanding. */
export function aiFor(s: Partial<ChatSettings>): AiPort | null {
  if (s.provider !== "groq" || !s.model || !env().GROQ_API_KEY) return null;
  return groqPort(s.model, {
    reserve: () => reserveAiCall(s.dailyAiCap ?? 0),
    record: (u) => recordAiUsage(u),
  });
}

/** What the question player needs to know about an Assisted session. */
export function assistedOptions(session: { mode?: string | null; chat?: { settings?: unknown } | null }) {
  if (session.mode !== "assisted") return undefined;
  const s = (session.chat?.settings ?? {}) as Partial<ChatSettings>;
  return { input: s.input === "text" ? ("text" as const) : ("chips" as const) };
}
