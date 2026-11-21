import type { Answer, Question } from "./types";

export type AnswerInput = { values?: unknown; number?: unknown; text?: unknown };

export type Validated = { ok: true; answer: Answer } | { ok: false; error: string };

/**
 * Letters in any script plus combining marks (needed for Indic scripts, where
 * vowel signs like ि are marks, not letters), spaces, apostrophes, hyphens, dots.
 */
const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'-]*$/u;

/**
 * Validate and normalise a raw answer for a question. The server never trusts
 * the client: values must be real option values, counts must respect
 * maxSelect, exclusive options can't be combined, numbers must be in range.
 */
export function validateAnswer(q: Question, input: AnswerInput): Validated {
  switch (q.type) {
    case "single": {
      const vals = Array.isArray(input.values) ? input.values : [];
      if (vals.length !== 1 || typeof vals[0] !== "string") return { ok: false, error: "Please choose one option." };
      if (!q.options?.some((o) => o.value === vals[0])) return { ok: false, error: "That option isn't available." };
      return { ok: true, answer: { values: [vals[0]] } };
    }

    case "multi": {
      const raw = Array.isArray(input.values) ? input.values : [];
      if (!raw.every((v) => typeof v === "string")) return { ok: false, error: "Invalid selection." };
      const vals = [...new Set(raw as string[])];
      if (vals.length === 0) return { ok: false, error: "Please choose at least one option." };
      const opts = q.options ?? [];
      if (!vals.every((v) => opts.some((o) => o.value === v))) return { ok: false, error: "That option isn't available." };
      const exclusive = vals.filter((v) => opts.find((o) => o.value === v)?.exclusive);
      if (exclusive.length > 0 && vals.length > 1) {
        return { ok: false, error: `"${opts.find((o) => o.value === exclusive[0])?.label}" can't be combined with other options.` };
      }
      if (q.maxSelect && vals.length > q.maxSelect) return { ok: false, error: `Choose up to ${q.maxSelect}.` };
      // Keep KB option order so stored answers are canonical.
      return { ok: true, answer: { values: opts.filter((o) => vals.includes(o.value)).map((o) => o.value) } };
    }

    case "number": {
      const n = typeof input.number === "string" ? Number(input.number) : input.number;
      if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: "Please enter a whole number." };
      if (q.min !== undefined && n < q.min) return { ok: false, error: `Please enter a number of at least ${q.min}.` };
      if (q.max !== undefined && n > q.max) return { ok: false, error: `Please enter a number no more than ${q.max}.` };
      return { ok: true, answer: { number: n } };
    }

    case "text": {
      const t = typeof input.text === "string" ? input.text.trim().replace(/\s+/g, " ") : "";
      if (!t) return { ok: false, error: "Please fill this in." };
      const max = q.maxLength ?? 60;
      if (t.length > max) return { ok: false, error: `Please keep it under ${max} characters.` };
      if (q.isNameQuestion && !NAME_RE.test(t)) return { ok: false, error: "Please use letters only." };
      return { ok: true, answer: { text: t } };
    }
  }
}
