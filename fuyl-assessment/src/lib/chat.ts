import "server-only";
import { nextStep } from "@/engine";
import { effectiveMode, type AssistedSettings } from "@/chat/settings";
import { askFor } from "@/chat/turn";
import { MAX_USER_TURNS, type ChatMessage, type ChatView } from "@/chat/types";
import type { AiPort } from "@/chat/ai";
import { maskEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { groqPort } from "@/lib/groq";
import { recordAiUsage, reserveAiCall } from "@/lib/assisted";
import { getKnowledgeBase } from "@/lib/kb";
import { sessionAnswers } from "@/lib/session";
import type { SessionDoc } from "@/models/assessment";

/** Settings a chat runs with (snapshot taken at start). */
export type ChatSettings = Pick<AssistedSettings, "mode" | "input" | "provider" | "model" | "dailyAiCap">;

export function snapshot(s: AssistedSettings): ChatSettings {
  return { mode: effectiveMode(s), input: s.input, provider: s.provider, model: s.model, dailyAiCap: s.dailyAiCap };
}

/** The AI port for a chat, or null for built-in understanding. */
export function aiFor(s: ChatSettings): AiPort | null {
  if (s.provider !== "groq" || !env().GROQ_API_KEY) return null;
  return groqPort(s.model, {
    reserve: () => reserveAiCall(s.dailyAiCap),
    record: (u) => recordAiUsage(u),
  });
}

type ChatSession = Pick<SessionDoc, "answers" | "status" | "chat"> & { resultToken?: string | null; email?: string | null };

export async function chatView(session: ChatSession): Promise<ChatView> {
  const kb = await getKnowledgeBase();
  const answers = sessionAnswers(session);
  const chat = session.chat;
  const settings = (chat?.settings ?? {}) as Partial<ChatSettings>;
  const step = nextStep(kb, answers);
  const status =
    session.status === "submitted" ? "submitted" : step.kind === "stopped" ? "stopped" : step.kind === "complete" ? "complete" : "active";
  return {
    messages: ((chat?.messages ?? []) as ChatMessage[]).slice(-200),
    status,
    input: settings.input === "text" ? "text" : "chips",
    ask: status === "active" ? askFor(kb, answers, chat?.askKey ?? undefined) : undefined,
    progress: step.kind === "question" ? step.progress : 1,
    resultToken: session.status === "submitted" ? (session.resultToken ?? undefined) : undefined,
    canSend: (chat?.userTurns ?? 0) < MAX_USER_TURNS,
    emailHint: session.email ? maskEmail(session.email) : undefined,
  };
}
