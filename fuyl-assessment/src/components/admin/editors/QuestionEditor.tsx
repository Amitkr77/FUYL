"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { NumberBand, Option, Question } from "@/engine";
import { Card, Field, btn, inputCls } from "../ui";
import { ConditionBuilder } from "./ConditionBuilder";
import { EditorShell, type Issues } from "./EditorShell";
import { EffectsEditor, FlagsInput } from "./EffectsEditor";
import type { EditorMeta } from "./meta";

const opt = (s: string) => (s.trim() === "" ? undefined : s);
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

export function QuestionEditor({
  initial,
  originalKey,
  meta,
  review,
  references,
  canDelete,
}: {
  initial: Question;
  originalKey: string | null;
  meta: EditorMeta;
  review?: { status: string; by?: string; at?: string };
  references: string[];
  canDelete: boolean;
}) {
  const [q, setQ] = useState<Question>(initial);
  const [issues, setIssues] = useState<Issues>({});
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setQ((cur) => ({ ...cur, [k]: v }));
  const isChoice = q.type === "single" || q.type === "multi";

  const setOption = (i: number, patch: Partial<Option>) => set("options", (q.options ?? []).map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const moveOption = (i: number, d: -1 | 1) => {
    const list = [...(q.options ?? [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("options", list);
  };
  const setBand = (i: number, patch: Partial<NumberBand>) => set("bands", (q.bands ?? []).map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <EditorShell type="question" originalKey={originalKey} value={q} review={review} references={references} canDelete={canDelete} onIssues={setIssues}>
      <div className="space-y-6">
        <Card title="Question">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prompt" hint="Shown to the user. Use {name} for their first name." error={issues.prompt} className="sm:col-span-2">
              <textarea value={q.prompt} onChange={(e) => set("prompt", e.target.value)} rows={2} className={inputCls} aria-invalid={!!issues.prompt} />
            </Field>
            <Field label="“Why we ask?”" error={issues.why} className="sm:col-span-2">
              <textarea value={q.why ?? ""} onChange={(e) => set("why", opt(e.target.value))} rows={2} className={inputCls} />
            </Field>
            <Field label="Helper line" hint="Small text under the prompt, e.g. “Pick up to 3.”" error={issues.helper}>
              <input value={q.helper ?? ""} onChange={(e) => set("helper", opt(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Summary sentence" hint="Use {answer} — e.g. “You sleep {answer} a night.” Leave empty to hide." error={issues.summaryTemplate}>
              <input value={q.summaryTemplate ?? ""} onChange={(e) => set("summaryTemplate", opt(e.target.value))} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Placement">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Key" hint="Unique id. Renaming updates every reference." error={issues.key}>
              <input value={q.key} onChange={(e) => set("key", e.target.value.toLowerCase())} className={`${inputCls} font-mono`} aria-invalid={!!issues.key} />
            </Field>
            <Field label="Block" error={issues.block}>
              <select value={q.block} onChange={(e) => set("block", e.target.value as Question["block"])} className={inputCls}>
                <option value="about">A · About you</option>
                <option value="lifestyle">B · Lifestyle</option>
                <option value="feel">C · How you feel</option>
                <option value="safety">D · Safety</option>
              </select>
            </Field>
            <Field label="Order in block" error={issues.order}>
              <input type="number" value={q.order} onChange={(e) => set("order", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Answer type" error={issues.type}>
              <select value={q.type} onChange={(e) => set("type", e.target.value as Question["type"])} className={inputCls}>
                <option value="single">Single choice (auto-advances)</option>
                <option value="multi">Multiple choice</option>
                <option value="number">Number</option>
                <option value="text">Text</option>
              </select>
            </Field>
            <Field label="Tier" hint="Follow-ups are dropped once the question cap is reached.">
              <select value={q.tier} onChange={(e) => set("tier", e.target.value as Question["tier"])} className={inputCls}>
                <option value="core">Core — always asked when shown</option>
                <option value="followup">Follow-up</option>
              </select>
            </Field>
            {q.type === "multi" && (
              <>
                <Field label="Max selections" hint="Leave empty to let people pick as many as they like." error={issues.maxSelect}>
                  <input type="number" value={q.maxSelect ?? ""} onChange={(e) => set("maxSelect", num(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Picks counted for scoring" hint="Only the strongest N picks count toward an area's maximum, so picking many doesn't lower everyone's match %." error={issues.scoreTop}>
                  <input type="number" value={q.scoreTop ?? ""} onChange={(e) => set("scoreTop", num(e.target.value))} className={inputCls} />
                </Field>
              </>
            )}
            {q.type === "number" && (
              <>
                <Field label="Min" error={issues.min}>
                  <input type="number" value={q.min ?? ""} onChange={(e) => set("min", num(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Max" error={issues.max}>
                  <input type="number" value={q.max ?? ""} onChange={(e) => set("max", num(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Unit">
                  <input value={q.unit ?? ""} onChange={(e) => set("unit", opt(e.target.value))} className={inputCls} />
                </Field>
              </>
            )}
            {(q.type === "number" || q.type === "text") && (
              <Field label="Placeholder">
                <input value={q.placeholder ?? ""} onChange={(e) => set("placeholder", opt(e.target.value))} className={inputCls} />
              </Field>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-forest">
            {q.type === "multi" && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!q.isPriorityQuestion} onChange={(e) => set("isPriorityQuestion", e.target.checked || undefined)} /> This is the “top priorities” question
              </label>
            )}
            {q.type === "text" && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!q.isNameQuestion} onChange={(e) => set("isNameQuestion", e.target.checked || undefined)} /> This is the name question
              </label>
            )}
          </div>
          {issues.options && <p className="mt-3 text-xs text-[#a3301e]">{issues.options}</p>}
        </Card>

        <Card title="Show this question…">
          <ConditionBuilder label="Show condition" value={q.showIf} onChange={(c) => set("showIf", c)} meta={meta} excludeQuestion={q.key} />
          <p className="mt-3 text-xs text-muted">Rules can only refer to questions asked earlier — the Checks page will flag anything else.</p>
        </Card>

        {isChoice && (
          <Card
            title={`Options (${q.options?.length ?? 0})`}
            actions={
              <button type="button" className={btn("secondary", "sm")} onClick={() => set("options", [...(q.options ?? []), { value: "", label: "" }])}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add option
              </button>
            }
          >
            <ol className="space-y-3">
              {(q.options ?? []).map((o, i) => (
                <li key={i} className="rounded-xl border border-line/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Field label="Label" error={issues[`options.${i}.label`]}>
                      <input value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Value" error={issues[`options.${i}.value`]}>
                      <input value={o.value} onChange={(e) => setOption(i, { value: e.target.value.toLowerCase() })} className={`${inputCls} font-mono`} />
                    </Field>
                    <div className="flex items-end gap-1">
                      <button type="button" onClick={() => moveOption(i, -1)} className={btn("ghost", "sm")} aria-label="Move up">
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => moveOption(i, 1)} className={btn("ghost", "sm")} aria-label="Move down">
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => set("options", (q.options ?? []).filter((_, j) => j !== i))} className={btn("ghost", "sm")} aria-label="Remove option">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <Field label="Summary phrase" hint="Fills {answer}. Tick “hide” to leave it out.">
                      <div className="flex items-center gap-2">
                        <input
                          value={o.summary ?? ""}
                          disabled={o.summary === null}
                          onChange={(e) => setOption(i, { summary: opt(e.target.value) })}
                          className={inputCls}
                          placeholder={o.label.toLowerCase()}
                        />
                        <label className="flex shrink-0 items-center gap-1 text-xs text-muted">
                          <input type="checkbox" checked={o.summary === null} onChange={(e) => setOption(i, { summary: e.target.checked ? null : undefined })} /> hide
                        </label>
                      </div>
                    </Field>
                    <Field label="Personal reason" hint="Shown under a focus area, e.g. “You often feel exhausted”.">
                      <input value={o.reason ?? ""} onChange={(e) => setOption(i, { reason: opt(e.target.value) })} className={inputCls} />
                    </Field>
                    <Field label="“Did you know?” insight (optional)" hint="Shown right after this answer. Keep it claim-safe.">
                      <input value={o.insight ?? ""} onChange={(e) => setOption(i, { insight: opt(e.target.value) })} className={inputCls} />
                    </Field>
                    <Field label="ⓘ Info (optional)">
                      <input value={o.info ?? ""} onChange={(e) => setOption(i, { info: opt(e.target.value) })} className={inputCls} />
                    </Field>
                    <Field label="Safety flags">
                      <FlagsInput value={o.flags} onChange={(v) => setOption(i, { flags: v })} meta={meta} />
                    </Field>
                    <div className="flex items-end">
                      {q.type === "multi" && (
                        <label className="flex items-center gap-1.5 pb-2 text-xs text-forest">
                          <input type="checkbox" checked={!!o.exclusive} onChange={(e) => setOption(i, { exclusive: e.target.checked || undefined })} /> Exclusive (“None”)
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-forest">Scores</p>
                    <EffectsEditor value={o.effects} onChange={(v) => setOption(i, { effects: v })} meta={meta} />
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {q.type === "number" && (
          <Card
            title="Number ranges"
            actions={
              <button type="button" className={btn("secondary", "sm")} onClick={() => set("bands", [...(q.bands ?? []), {}])}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add range
              </button>
            }
          >
            <p className="mb-3 text-xs text-muted">Each range can raise flags (e.g. under_19), add scores and set the summary phrase ({"{value}"} = the number).</p>
            <ol className="space-y-3">
              {(q.bands ?? []).map((b, i) => (
                <li key={i} className="grid gap-3 rounded-xl border border-line/60 p-4 sm:grid-cols-4">
                  <Field label="From (incl.)">
                    <input type="number" value={b.min ?? ""} onChange={(e) => setBand(i, { min: num(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="To (incl.)">
                    <input type="number" value={b.max ?? ""} onChange={(e) => setBand(i, { max: num(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Summary">
                    <input value={b.summary ?? ""} disabled={b.summary === null} onChange={(e) => setBand(i, { summary: opt(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Flags">
                    <FlagsInput value={b.flags} onChange={(v) => setBand(i, { flags: v })} meta={meta} />
                  </Field>
                  <Field label="Personal reason" className="sm:col-span-2">
                    <input value={b.reason ?? ""} onChange={(e) => setBand(i, { reason: opt(e.target.value) })} className={inputCls} />
                  </Field>
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-xs font-medium text-forest">Scores</p>
                    <EffectsEditor value={b.effects} onChange={(v) => setBand(i, { effects: v })} meta={meta} />
                  </div>
                  <button type="button" onClick={() => set("bands", (q.bands ?? []).filter((_, j) => j !== i))} className={`${btn("ghost", "sm")} justify-self-start`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </EditorShell>
  );
}
