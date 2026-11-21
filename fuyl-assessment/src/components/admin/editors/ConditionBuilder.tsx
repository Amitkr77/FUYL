"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Condition } from "@/engine";
import { btn, inputCls } from "../ui";
import type { EditorMeta } from "./meta";

/**
 * No-code editor for conditions: "Always", or "All / Any of" a list of rules.
 * Each rule is one of: answer is / isn't one of…, number in range, question
 * answered, flag raised, focus-area score at least. Conditions that use
 * nesting beyond that (e.g. "not", groups inside groups) open in a JSON view
 * so nothing is ever silently lost.
 */

type Leaf = Exclude<Condition, { all: Condition[] } | { any: Condition[] } | { not: Condition }>;
type Mode = "none" | "all" | "any";

function decompose(c: Condition | undefined): { mode: Mode; rows: Leaf[] } | null {
  if (!c) return { mode: "none", rows: [] };
  const isLeaf = (x: Condition): x is Leaf => !("all" in x) && !("any" in x) && !("not" in x);
  if ("all" in c) return c.all.every(isLeaf) ? { mode: "all", rows: c.all as Leaf[] } : null;
  if ("any" in c) return c.any.every(isLeaf) ? { mode: "any", rows: c.any as Leaf[] } : null;
  if ("not" in c) return null;
  return { mode: "all", rows: [c] };
}

function compose(mode: Mode, rows: Leaf[]): Condition | undefined {
  if (mode === "none" || rows.length === 0) return undefined;
  if (rows.length === 1) return rows[0];
  return mode === "all" ? { all: rows } : { any: rows };
}

type RowKind = "answerIn" | "answerNotIn" | "number" | "answered" | "flag" | "score";
const kindOf = (r: Leaf): RowKind =>
  "answer" in r ? ("in" in r ? "answerIn" : "answerNotIn") : "number" in r ? "number" : "answered" in r ? "answered" : "flag" in r ? "flag" : "score";

export function ConditionBuilder({
  value,
  onChange,
  meta,
  allowNone = true,
  excludeQuestion,
  label,
}: {
  value: Condition | undefined;
  onChange: (c: Condition | undefined) => void;
  meta: EditorMeta;
  allowNone?: boolean;
  excludeQuestion?: string;
  label: string;
}) {
  const parts = decompose(value);
  const [json, setJson] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!parts) {
    return (
      <div>
        <p className="mb-2 text-xs text-muted">This condition uses advanced nesting, so it&rsquo;s shown as JSON.</p>
        <textarea
          aria-label={label}
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed ?? undefined);
              setJsonError(null);
            } catch {
              setJsonError("Invalid JSON");
            }
          }}
          rows={8}
          className={`${inputCls} font-mono text-xs`}
        />
        {jsonError && <p className="mt-1 text-xs text-[#a3301e]">{jsonError}</p>}
      </div>
    );
  }

  const { mode, rows } = parts;
  const questions = meta.questions.filter((q) => q.key !== excludeQuestion);
  const choiceQs = questions.filter((q) => q.type === "single" || q.type === "multi");
  const numberQs = questions.filter((q) => q.type === "number");
  const setRows = (next: Leaf[]) => onChange(compose(mode === "none" ? "all" : mode, next));
  const setRow = (i: number, r: Leaf) => setRows(rows.map((x, j) => (j === i ? r : x)));

  const blank = (kind: RowKind): Leaf => {
    const q = choiceQs[0];
    switch (kind) {
      case "answerIn":
        return { answer: q?.key ?? "", in: q?.options[0] ? [q.options[0].value] : [] };
      case "answerNotIn":
        return { answer: q?.key ?? "", notIn: q?.options[0] ? [q.options[0].value] : [] };
      case "number":
        return { number: numberQs[0]?.key ?? "", gte: 0 };
      case "answered":
        return { answered: questions[0]?.key ?? "" };
      case "flag":
        return { flag: meta.flags[0] ?? "" };
      case "score":
        return { score: meta.areas[0]?.key ?? "", gte: 1 };
    }
  };

  return (
    <div className="space-y-3">
      <select
        aria-label={label}
        value={mode}
        onChange={(e) => {
          const m = e.target.value as Mode;
          onChange(m === "none" ? undefined : compose(m, rows.length ? rows : [blank("answerIn")]));
        }}
        className={`${inputCls} max-w-xs`}
      >
        {allowNone && <option value="none">Always</option>}
        <option value="all">When ALL of these are true</option>
        <option value="any">When ANY of these is true</option>
      </select>

      {mode !== "none" && (
        <ul className="space-y-2">
          {rows.map((row, i) => {
            const kind = kindOf(row);
            return (
              <li key={i} className="flex flex-wrap items-start gap-2 rounded-xl border border-line/60 bg-cream/40 p-3">
                <select value={kind} onChange={(e) => setRow(i, blank(e.target.value as RowKind))} className={`${inputCls} w-auto`} aria-label="Rule type">
                  <option value="answerIn">Answer is one of</option>
                  <option value="answerNotIn">Answered, but none of</option>
                  <option value="number">Number is between</option>
                  <option value="answered">Question was answered</option>
                  <option value="flag">Flag was raised</option>
                  <option value="score">Focus-area score at least</option>
                </select>

                {(kind === "answerIn" || kind === "answerNotIn") && "answer" in row && (
                  <AnswerRule
                    row={row}
                    questions={choiceQs}
                    onChange={(q, values) => setRow(i, kind === "answerIn" ? { answer: q, in: values } : { answer: q, notIn: values })}
                  />
                )}

                {kind === "number" && "number" in row && (
                  <>
                    <select value={row.number} onChange={(e) => setRow(i, { ...row, number: e.target.value })} className={`${inputCls} w-auto`} aria-label="Number question">
                      {numberQs.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.key}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="min"
                      aria-label="Minimum (inclusive)"
                      value={row.gte ?? ""}
                      onChange={(e) => setRow(i, cleanNumber({ ...row, gte: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className={`${inputCls} w-24`}
                    />
                    <span className="self-center text-xs text-muted">to</span>
                    <input
                      type="number"
                      placeholder="max"
                      aria-label="Maximum (inclusive)"
                      value={row.lte ?? ""}
                      onChange={(e) => setRow(i, cleanNumber({ ...row, lte: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className={`${inputCls} w-24`}
                    />
                  </>
                )}

                {kind === "answered" && "answered" in row && (
                  <select value={row.answered} onChange={(e) => setRow(i, { answered: e.target.value })} className={`${inputCls} w-auto`} aria-label="Question">
                    {questions.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.key}
                      </option>
                    ))}
                  </select>
                )}

                {kind === "flag" && "flag" in row && (
                  <>
                    <input list="known-flags" value={row.flag} onChange={(e) => setRow(i, { flag: e.target.value.trim() })} className={`${inputCls} w-56`} aria-label="Flag" />
                    <datalist id="known-flags">
                      {meta.flags.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </>
                )}

                {kind === "score" && "score" in row && (
                  <>
                    <select value={row.score} onChange={(e) => setRow(i, { ...row, score: e.target.value })} className={`${inputCls} w-auto`} aria-label="Focus area">
                      {meta.areas.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <input type="number" value={row.gte} onChange={(e) => setRow(i, { ...row, gte: Number(e.target.value) })} className={`${inputCls} w-24`} aria-label="Minimum score" />
                  </>
                )}

                <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className={`${btn("ghost", "sm")} ml-auto`} aria-label="Remove rule">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {mode !== "none" && (
        <button type="button" onClick={() => setRows([...rows, blank("answerIn")])} className={btn("secondary", "sm")}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add rule
        </button>
      )}
    </div>
  );
}

function cleanNumber<T extends { gte?: number; lte?: number }>(r: T): T {
  const out = { ...r };
  if (out.gte === undefined) delete out.gte;
  if (out.lte === undefined) delete out.lte;
  return out;
}

function AnswerRule({
  row,
  questions,
  onChange,
}: {
  row: { answer: string; in?: string[]; notIn?: string[] };
  questions: EditorMeta["questions"];
  onChange: (question: string, values: string[]) => void;
}) {
  const values = row.in ?? row.notIn ?? [];
  const q = questions.find((x) => x.key === row.answer);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <select
        value={row.answer}
        onChange={(e) => {
          const next = questions.find((x) => x.key === e.target.value);
          onChange(e.target.value, next?.options[0] ? [next.options[0].value] : []);
        }}
        className={`${inputCls} w-auto`}
        aria-label="Question"
      >
        {questions.map((x) => (
          <option key={x.key} value={x.key}>
            {x.key} — {x.prompt.slice(0, 50)}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-1.5">
        {(q?.options ?? []).map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(row.answer, on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-forest bg-forest text-white" : "border-line bg-white text-forest"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
