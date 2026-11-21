"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import {
  buildContext,
  buildResult,
  evaluateSafety,
  maxScores,
  nextStep,
  prune,
  validateAnswer,
  type Answers,
  type KnowledgeBase,
  type Question,
} from "@/engine";
import { Badge, Card, btn, inputCls } from "./ui";

/**
 * Click through the DRAFT knowledge base exactly as a user would, with the
 * engine's internals visible: running scores, raised flags, triggered safety
 * rules and the result. Nothing is saved.
 */
export function Simulator({ kb }: { kb: KnowledgeBase }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [path, setPath] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const kept = useMemo(() => prune(kb, answers), [kb, answers]);
  const step = useMemo(() => nextStep(kb, kept), [kb, kept]);
  const ctx = useMemo(() => buildContext(kb, kept), [kb, kept]);
  const max = useMemo(() => maxScores(kb), [kb]);
  const safety = useMemo(() => evaluateSafety(kb, ctx), [kb, ctx]);
  const result = useMemo(() => (step.kind === "question" ? null : buildResult(kb, kept)), [kb, kept, step.kind]);
  const visiblePath = path.filter((k) => kept[k]);

  function answer(q: Question, input: Parameters<typeof validateAnswer>[1]) {
    const v = validateAnswer(q, input);
    if (!v.ok) return setError(v.error);
    setError(null);
    setAnswers((a) => ({ ...a, [q.key]: v.answer }));
    setPath((p) => [...p.filter((k) => k !== q.key), q.key]);
  }

  function rewindTo(key: string) {
    const idx = visiblePath.indexOf(key);
    const drop = new Set(visiblePath.slice(idx));
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !drop.has(k))));
    setPath(visiblePath.slice(0, idx));
  }

  const q = step.kind === "question" ? kb.questions.find((x) => x.key === step.question.key)! : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card
          title={step.kind === "question" ? `Question ${visiblePath.length + 1} · ${Math.round(step.progress * 100)}%` : step.kind === "stopped" ? "Stopped" : "Complete"}
          actions={
            <div className="flex gap-2">
              <button type="button" className={btn("ghost", "sm")} disabled={!visiblePath.length} onClick={() => rewindTo(visiblePath[visiblePath.length - 1])}>
                <Undo2 className="h-3.5 w-3.5" aria-hidden /> Back
              </button>
              <button type="button" className={btn("ghost", "sm")} onClick={() => (setAnswers({}), setPath([]), setError(null))}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
              </button>
            </div>
          }
        >
          {step.kind === "question" && q && (
            <div>
              <p className="font-display text-2xl text-forest">{step.question.prompt}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {q.key} · {q.type} · {q.tier}
                {q.showIf ? " · conditional" : ""}
              </p>
              <SimInput key={q.key} q={q} onAnswer={(input) => answer(q, input)} />
              {error && <p className="mt-2 text-sm text-[#a3301e]">{error}</p>}
            </div>
          )}
          {step.kind === "stopped" && (
            <div>
              <Badge tone="bad">Stop rule: {step.rule.key}</Badge>
              <p className="mt-3 font-display text-2xl text-forest">{step.rule.title}</p>
              <p className="mt-2 text-sm text-muted">{step.rule.message}</p>
            </div>
          )}
          {step.kind === "complete" && <p className="text-sm text-forest">All questions answered — see the result below.</p>}
        </Card>

        {result && (
          <Card title="Result">
            <p className="text-sm text-muted">
              Product shown: <strong className="text-forest">{result.showProduct ? "yes" : "no"}</strong> · covers {result.coverage.areaCount} area(s) with {result.coverage.ingredientCount} ingredients
            </p>
            <div className="mt-4 space-y-4">
              {result.areas.map((a) => (
                <div key={a.key} className="rounded-xl border border-line/60 p-4">
                  <p className="font-medium text-forest">
                    {a.name} <Badge tone="info">{a.level} · {a.match}%</Badge> {a.isPriority && <Badge tone="good">priority</Badge>}
                  </p>
                  {a.reasons.length > 0 && <p className="mt-1 text-xs text-muted">{a.reasons.join(" · ")}</p>}
                  <p className="mt-2 text-xs text-forest">
                    {a.ingredients.map((i) => `${i.name}${i.sharedWith ? " (shared)" : ""}`).join(", ")}
                  </p>
                </div>
              ))}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-teal-deep">Profile summary ({result.summary.length} lines)</summary>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {result.summary.map((l) => (
                  <li key={l.questionKey}>{l.text}</li>
                ))}
              </ul>
            </details>
          </Card>
        )}
      </div>

      <aside className="space-y-6">
        <Card title="Scores">
          <ul className="space-y-2">
            {[...kb.areas]
              .sort((a, b) => (ctx.scores[b.key] ?? 0) / (max[b.key] || 1) - (ctx.scores[a.key] ?? 0) / (max[a.key] || 1))
              .map((a) => {
                const s = ctx.scores[a.key] ?? 0;
                const f = max[a.key] ? Math.min(1, s / max[a.key]) : 0;
                return (
                  <li key={a.key} className="text-xs">
                    <div className="flex justify-between text-forest">
                      <span>{a.name}</span>
                      <span className="tabular-nums text-muted">
                        {s} / {max[a.key] ?? 0}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${f * 100}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>
        <Card title="Flags & safety">
          {ctx.flags.size === 0 ? <p className="text-xs text-muted">No flags raised.</p> : <div className="flex flex-wrap gap-1">{[...ctx.flags].map((f) => <Badge key={f}>{f}</Badge>)}</div>}
          <ul className="mt-3 space-y-1">
            {safety.notes.map((n) => (
              <li key={n.key} className="text-xs">
                <Badge tone={n.level === "stop" ? "bad" : n.level === "consult" ? "warn" : "info"}>{n.level}</Badge> <span className="text-forest">{n.title}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={`Path (${visiblePath.length})`}>
          {visiblePath.length === 0 ? (
            <p className="text-xs text-muted">Answer a question to start.</p>
          ) : (
            <ol className="space-y-1 text-xs">
              {visiblePath.map((k, i) => (
                <li key={k}>
                  <button type="button" onClick={() => rewindTo(k)} className="w-full truncate rounded px-1 text-left font-mono text-forest hover:bg-cream" title="Go back to here">
                    {i + 1}. {k}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </aside>
    </div>
  );
}

function SimInput({ q, onAnswer }: { q: Question; onAnswer: (input: { values?: string[]; number?: string; text?: string }) => void }) {
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState("");
  if (q.type === "single")
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {q.options?.map((o) => (
          <button key={o.value} type="button" onClick={() => onAnswer({ values: [o.value] })} className="rounded-xl border border-line bg-white px-4 py-3 text-left text-sm text-forest hover:border-teal hover:bg-cream/50">
            {o.label}
            <OptionMeta o={o} />
          </button>
        ))}
      </div>
    );
  if (q.type === "multi")
    return (
      <div className="mt-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options?.map((o) => {
            const on = multi.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setMulti(on ? multi.filter((v) => v !== o.value) : o.exclusive ? [o.value] : [...multi.filter((v) => !q.options?.find((x) => x.value === v)?.exclusive), o.value])}
                className={`rounded-xl border px-4 py-3 text-left text-sm ${on ? "border-forest bg-forest text-white" : "border-line bg-white text-forest hover:bg-cream/50"}`}
              >
                {o.label}
                <OptionMeta o={o} />
              </button>
            );
          })}
        </div>
        <button type="button" className={`${btn("primary")} mt-3`} disabled={!multi.length} onClick={() => onAnswer({ values: multi })}>
          Continue
        </button>
      </div>
    );
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(q.type === "number" ? { number: text } : { text });
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} inputMode={q.type === "number" ? "numeric" : "text"} className={`${inputCls} max-w-xs`} aria-label="Answer" />
      <button className={btn("primary")}>Continue</button>
    </form>
  );
}

function OptionMeta({ o }: { o: NonNullable<Question["options"]>[number] }) {
  const bits = [...(o.effects ?? []).map((e) => `${e.area} ${e.weight > 0 ? "+" : ""}${e.weight}`), ...(o.flags ?? []).map((f) => `⚑ ${f}`)];
  return bits.length ? <span className="mt-1 block text-[10px] opacity-70">{bits.join(" · ")}</span> : null;
}
