import type { Question, RenderedQuestion } from "@/engine";
import type { ChatMessage } from "./types";

/**
 * Fixed chat copy (no AI). Everything a user reads in built-in mode comes from
 * here or from the reviewed question text in the knowledge base.
 */

export const GREETING =
  "Hi, I'm the FUYL wellness advisor. I'll ask about your routine and how you've been feeling. It takes about 4 minutes, and you can reply in your own words or tap an answer.";

export const URGENT_REPLY =
  "That sounds serious, and I'm not able to help with it here. Please contact a doctor now, or call 112 for an emergency. If you're struggling emotionally, Tele-MANAS (14416) is free and available 24/7. We can continue the questionnaire whenever you're ready.";

export const OFF_TOPIC_HINT = "I can only help with this short questionnaire, but I'd love to finish it with you.";

export const RECAP_INTRO = (name?: string) =>
  `That's everything${name ? `, ${name}` : ""}! Here's what I heard. If it looks right, I'll put together your results.`;

const ACKS = ["Got it.", "Thanks.", "Noted.", "Okay, thanks.", "Thanks for sharing that.", "Understood."];

/** Deterministic, varied acknowledgement (so tests are stable). */
export function ackFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ACKS[h % ACKS.length];
}

/** Prompts that already greet or address the user don't need a "Got it." in front. */
const needsAck = (prompt: string) => !/^(nice to meet|almost done|last one|let's get started)/i.test(prompt);

export function questionText(q: RenderedQuestion, ack?: string): string {
  const lead = ack && needsAck(q.prompt) ? `${ack} ` : "";
  const hint = q.type === "multi" ? (q.maxSelect ? ` (Pick up to ${q.maxSelect}.)` : " (Pick any that apply.)") : "";
  return `${lead}${q.prompt}${hint}`;
}

const list = (labels: string[], joiner: string) =>
  labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} ${joiner} ${labels.at(-1)}`;

/** Re-ask with the options spelled out. */
export function clarifyText(q: Question | RenderedQuestion, reason?: "unclear" | "too-many", max?: number): string {
  if (reason === "too-many") return `Please pick up to ${max}. Which matter most to you?`;
  switch (q.type) {
    case "number":
      return `Sorry, I didn't catch that. Could you reply with a number${q.min !== undefined && q.max !== undefined ? ` between ${q.min} and ${q.max}` : ""}?`;
    case "text":
      return q.isNameQuestion ? "What's your first name? Just the name is perfect." : "Could you say that a little differently?";
    case "single":
      return `Sorry, I didn't quite get that. Is it ${list((q.options ?? []).map((o) => o.label), "or")}?`;
    case "multi":
      return `Sorry, I didn't quite get that. Any of these: ${list((q.options ?? []).map((o) => o.label), "or")}?`;
  }
}

/** Matches messages that need a doctor, not a questionnaire. */
const URGENT =
  /\b(chest pain|heart attack|can'?t breathe|cannot breathe|struggling to breathe|suicid\w*|kill myself|end my life|self[- ]harm|hurt myself|overdos\w*|fainted|passed out|severe bleeding|stroke|seizure)\b/i;
export const isUrgent = (text: string) => URGENT.test(text);

/** Strip links and markup from AI text, and keep it short. */
export function cleanAiText(text: string, max = 600): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

let counter = 0;
export function message(m: Omit<ChatMessage, "id" | "at">): ChatMessage {
  counter = (counter + 1) % 1_000_000;
  return { id: `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), ...m };
}
