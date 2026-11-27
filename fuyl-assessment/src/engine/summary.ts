import { orderedQuestions } from "./flow";
import { bandFor, selectedOptions } from "./scoring";
import { firstName, joinList, render } from "./text";
import type { Answers, KnowledgeBase, SummaryLine } from "./types";

/**
 * Plain-sentence profile summary built from each answered question's
 * `summaryTemplate`. {answer} is filled from the chosen options' `summary`
 * phrases (falling back to the lower-cased label). Options whose summary is
 * `null` are omitted; if nothing is left, the line is dropped.
 */
export function buildSummary(kb: KnowledgeBase, answers: Answers): SummaryLine[] {
  const name = firstName(kb, answers);
  const lines: SummaryLine[] = [];

  for (const q of orderedQuestions(kb)) {
    const a = answers[q.key];
    if (!a || !q.summaryTemplate) continue;

    let answerText: string | undefined;
    if (q.type === "number") {
      const band = bandFor(q, a.number);
      if (band?.summary === null) continue;
      answerText = band?.summary ?? `${a.number}${q.unit ? ` ${q.unit}` : ""}`;
      answerText = answerText.replace(/\{value\}/g, String(a.number));
    } else if (q.type === "text") {
      answerText = q.isNameQuestion ? name : a.text;
    } else if (q.type === "grid") {
      const parts = (q.rows ?? [])
        .filter((r) => a.grid?.[r.key])
        .map((r) => {
          const o = q.options?.find((x) => x.value === a.grid![r.key]);
          return o && o.summary !== null ? `${r.summary ?? r.label.toLowerCase()} ${o.summary ?? o.label.toLowerCase()}` : null;
        })
        .filter((x): x is string => Boolean(x));
      if (parts.length === 0) continue;
      answerText = joinList(parts);
    } else {
      const phrases = selectedOptions(q, answers)
        .filter((o) => o.summary !== null)
        .map((o) => o.summary ?? o.label.toLowerCase());
      if (phrases.length === 0) continue;
      answerText = joinList(phrases);
    }
    if (!answerText) continue;

    lines.push({
      block: q.block,
      questionKey: q.key,
      text: render(q.summaryTemplate.replace(/\{answer\}/g, answerText), name),
    });
  }
  return lines;
}
