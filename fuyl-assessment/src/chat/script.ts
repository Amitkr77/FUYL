import type { Question, RenderedQuestion } from "@/engine";

/**
 * Fixed copy for the Assisted assessment (no AI): the urgent-symptom reply,
 * "please say that differently" prompts, and AI-text cleanup.
 */

export const URGENT_REPLY =
  "That sounds serious, and I'm not able to help with it here. Please contact a doctor now, or call 112 for an emergency. If you're struggling emotionally, Tele-MANAS (14416) is free and available 24/7. We can continue the questionnaire whenever you're ready.";

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
    case "grid":
      return "For this one, please tap how often for each row.";
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
