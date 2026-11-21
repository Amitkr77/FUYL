import type { Answers, KnowledgeBase } from "./types";

/** First name from the name question, trimmed and title-cased; undefined if absent. */
export function firstName(kb: KnowledgeBase, answers: Answers): string | undefined {
  const q = kb.questions.find((x) => x.isNameQuestion);
  const raw = q ? answers[q.key]?.text?.trim() : undefined;
  if (!raw) return undefined;
  const first = raw.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Fill {name} in copy. When no name is known, "{name}, " / ", {name}" style
 * fragments collapse cleanly instead of leaving a dangling comma.
 */
export function render(template: string, name: string | undefined): string {
  if (name) return template.replace(/\{name\}/g, name);
  return template
    .replace(/,\s*\{name\}/g, "")
    .replace(/\{name\},\s*/g, "")
    .replace(/\{name\}/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*([a-z])/, (_, c: string) => c.toUpperCase())
    .trim();
}

/** "a", "a and b", "a, b and c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
