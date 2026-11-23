/**
 * One line of an Assisted assessment transcript (free-text answers and the
 * assistant's replies), stored on the session for the admin transcript view.
 */
export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  at: string;
  /** What produced it: ai (Groq), builtin (rules), guard (urgent-symptom reply). */
  via?: "ai" | "builtin" | "chip" | "guard";
  /** The question it was about. */
  questionKey?: string;
  kind?: "question" | "clarify" | "stop" | "recap" | "note" | "ack";
  lines?: string[];
}

/** Max free-text answers per assessment (abuse / cost guard). */
export const MAX_USER_TURNS = 80;
/** Max characters per free-text answer. */
export const MAX_MESSAGE_CHARS = 500;

let counter = 0;
export function chatMessage(m: Omit<ChatMessage, "id" | "at">): ChatMessage {
  counter = (counter + 1) % 1_000_000;
  return { id: `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), ...m };
}
