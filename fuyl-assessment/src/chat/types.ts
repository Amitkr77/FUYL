import type { AnswerInput } from "@/engine";

export type ChatRole = "assistant" | "user";

/**
 * One line of the transcript. Stored on the session (server) and sent to the
 * browser as-is — nothing in here is secret.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  at: string;
  /** What produced it: ai (Groq), builtin (rules/templates), chip (a tapped suggestion), guard (safety reply). */
  via?: "ai" | "builtin" | "chip" | "guard";
  kind?: "question" | "clarify" | "stop" | "recap" | "note";
  /** recap only: the profile summary lines. */
  lines?: string[];
}

export interface ChatOption {
  value: string;
  label: string;
  exclusive?: boolean;
}

/** The question the chat is currently waiting on (drives chips and the number keypad). */
export interface ChatAsk {
  key: string;
  type: "single" | "multi" | "number" | "text";
  options?: ChatOption[];
  maxSelect?: number;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}

export interface ChatView {
  messages: ChatMessage[];
  status: "active" | "stopped" | "complete" | "submitted";
  input: "text" | "chips";
  ask?: ChatAsk;
  /** 0–1 estimate. */
  progress: number;
  resultToken?: string;
  /** Whether the user can still send messages (per-chat cap). */
  canSend: boolean;
  /** Masked report address, e.g. "ri***@gmail.com". */
  emailHint?: string;
}

export type TurnInput = { kind: "text"; text: string } | { kind: "choice"; key: string; input: AnswerInput };

/** Max user messages per chat (abuse / cost guard). */
export const MAX_USER_TURNS = 60;
/** Max characters per user message. */
export const MAX_MESSAGE_CHARS = 500;
