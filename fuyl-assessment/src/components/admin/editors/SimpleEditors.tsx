"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FocusArea, Ingredient, SafetyRule } from "@/engine";
import { Card, Field, btn, inputCls } from "../ui";
import { ConditionBuilder } from "./ConditionBuilder";
import { EditorShell, type Issues } from "./EditorShell";
import type { EditorMeta } from "./meta";

const opt = (s: string) => (s.trim() === "" ? undefined : s);

type Common = {
  originalKey: string | null;
  meta: EditorMeta;
  review?: { status: string; by?: string; at?: string };
  references: string[];
  canDelete: boolean;
};

// ─── Focus area ─────────────────────────────────────────────────────────────

export function AreaEditor({ initial, ...common }: Common & { initial: FocusArea }) {
  const [a, setA] = useState<FocusArea>(initial);
  const [issues, setIssues] = useState<Issues>({});
  const set = <K extends keyof FocusArea>(k: K, v: FocusArea[K]) => setA((cur) => ({ ...cur, [k]: v }));
  const linked = new Set(a.ingredients.map((i) => i.key));

  return (
    <EditorShell type="area" value={a} onIssues={setIssues} {...common}>
      <div className="space-y-6">
        <Card title="Focus area">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" error={issues.name}>
              <input value={a.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Key" error={issues.key} hint="Renaming updates every score that uses it.">
              <input value={a.key} onChange={(e) => set("key", e.target.value.toLowerCase())} className={`${inputCls} font-mono`} />
            </Field>
            <Field label="Order (tie-break)" error={issues.order}>
              <input type="number" value={a.order} onChange={(e) => set("order", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Result copy" hint="Claim-safe: “supports”, “contributes to normal…”. Never “treats” or “cures”." error={issues.copy} className="sm:col-span-3">
              <textarea value={a.copy} onChange={(e) => set("copy", e.target.value)} rows={3} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card
          title={`Linked ingredients (${a.ingredients.length})`}
          actions={
            <select
              aria-label="Link an ingredient"
              value=""
              onChange={(e) => e.target.value && set("ingredients", [...a.ingredients, { key: e.target.value, weight: 3, why: "" }])}
              className={`${inputCls} w-56`}
            >
              <option value="">+ Link ingredient…</option>
              {common.meta.ingredients
                .filter((i) => !linked.has(i.key))
                .map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.name}
                  </option>
                ))}
            </select>
          }
        >
          {issues.ingredients && <p className="mb-2 text-xs text-[#a3301e]">{issues.ingredients}</p>}
          <ol className="space-y-2">
            {[...a.ingredients]
              .map((ing, i) => ({ ing, i }))
              .sort((x, y) => y.ing.weight - x.ing.weight)
              .map(({ ing, i }) => (
                <li key={ing.key} className="grid gap-2 rounded-xl border border-line/60 p-3 sm:grid-cols-[180px_80px_1fr_auto]">
                  <span className="self-center text-sm font-medium text-forest">{common.meta.ingredients.find((x) => x.key === ing.key)?.name ?? ing.key}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={ing.weight}
                    aria-label="Weight (higher = listed first)"
                    onChange={(e) => set("ingredients", a.ingredients.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))}
                    className={inputCls}
                  />
                  <input
                    value={ing.why}
                    aria-label="Why it helps"
                    placeholder="Why it helps (claim-safe)"
                    onChange={(e) => set("ingredients", a.ingredients.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)))}
                    className={inputCls}
                    aria-invalid={!!issues[`ingredients.${i}.why`]}
                  />
                  <button type="button" onClick={() => set("ingredients", a.ingredients.filter((_, j) => j !== i))} className={btn("ghost", "sm")} aria-label="Unlink">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Weight orders ingredients within this area (higher first).</p>
        </Card>

        <Card
          title="Lifestyle tips"
          actions={
            <button type="button" onClick={() => set("tips", [...a.tips, ""])} className={btn("secondary", "sm")}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add tip
            </button>
          }
        >
          <ol className="space-y-2">
            {a.tips.map((t, i) => (
              <li key={i} className="flex gap-2">
                <input value={t} onChange={(e) => set("tips", a.tips.map((x, j) => (j === i ? e.target.value : x)))} className={inputCls} aria-label={`Tip ${i + 1}`} />
                <button type="button" onClick={() => set("tips", a.tips.filter((_, j) => j !== i))} className={btn("ghost", "sm")} aria-label="Remove tip">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">The first two tips are shown on the result.</p>
        </Card>
      </div>
    </EditorShell>
  );
}

// ─── Ingredient ─────────────────────────────────────────────────────────────

export function IngredientEditor({ initial, ...common }: Common & { initial: Ingredient }) {
  const [ing, setIng] = useState<Ingredient>(initial);
  const [issues, setIssues] = useState<Issues>({});
  const set = <K extends keyof Ingredient>(k: K, v: Ingredient[K]) => setIng((cur) => ({ ...cur, [k]: v }));

  return (
    <EditorShell type="ingredient" value={ing} onIssues={setIssues} {...common}>
      <Card title="Ingredient">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={issues.name}>
            <input value={ing.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Key" error={issues.key} hint="Renaming updates focus areas and safety rules.">
            <input value={ing.key} onChange={(e) => set("key", e.target.value.toLowerCase())} className={`${inputCls} font-mono`} />
          </Field>
          <Field label="Blend" hint="As printed on the label.">
            <input value={ing.blend ?? ""} onChange={(e) => set("blend", opt(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Category">
            <input value={ing.category ?? ""} onChange={(e) => set("category", opt(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Dose (this ingredient)" hint="Vitamins & minerals, e.g. “2.2 mcg”. From the nutrition label.">
            <input value={ing.dose ?? ""} onChange={(e) => set("dose", opt(e.target.value))} className={inputCls} />
          </Field>
          <Field label="% RDA per serve" error={issues.rda}>
            <input type="number" step="0.1" value={ing.rda ?? ""} onChange={(e) => set("rda", e.target.value === "" ? undefined : Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Blend dose" hint="Botanicals: the blend total from the label, e.g. “400 mg”. Never invent per-herb amounts.">
            <input value={ing.blendDose ?? ""} onChange={(e) => set("blendDose", opt(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Image" hint="Synced from fuyl.in automatically. Override only if needed.">
            <input value={ing.image ?? ""} onChange={(e) => set("image", opt(e.target.value))} className={inputCls} placeholder="(from fuyl.in)" />
          </Field>
          <Field label="Description" hint="Claim-safe." className="sm:col-span-2">
            <textarea value={ing.description ?? ""} onChange={(e) => set("description", opt(e.target.value))} rows={2} className={inputCls} />
          </Field>
        </div>
      </Card>
    </EditorShell>
  );
}

// ─── Safety rule ────────────────────────────────────────────────────────────

export function SafetyEditor({ initial, ...common }: Common & { initial: SafetyRule }) {
  const [r, setR] = useState<SafetyRule>(initial);
  const [issues, setIssues] = useState<Issues>({});
  const set = <K extends keyof SafetyRule>(k: K, v: SafetyRule[K]) => setR((cur) => ({ ...cur, [k]: v }));

  return (
    <EditorShell type="safety" value={r} onIssues={setIssues} {...common}>
      <div className="space-y-6">
        <Card title="Rule">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Title" error={issues.title} className="sm:col-span-2">
              <input value={r.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Level" error={issues.level}>
              <select value={r.level} onChange={(e) => set("level", e.target.value as SafetyRule["level"])} className={inputCls}>
                <option value="stop">Stop — end the assessment, no product</option>
                <option value="consult">Consult — product shown with doctor note</option>
                <option value="caution">Caution</option>
                <option value="info">Info</option>
              </select>
            </Field>
            <Field label="Message to the user" error={issues.message} className="sm:col-span-3">
              <textarea value={r.message} onChange={(e) => set("message", e.target.value)} rows={3} className={inputCls} />
            </Field>
            <Field label="Key" error={issues.key}>
              <input value={r.key} onChange={(e) => set("key", e.target.value.toLowerCase())} className={`${inputCls} font-mono`} />
            </Field>
          </div>
        </Card>
        <Card title="Applies when…">
          <ConditionBuilder label="Rule condition" value={r.when} onChange={(c) => c && set("when", c)} meta={common.meta} allowNone={false} />
          {issues.when && <p className="mt-2 text-xs text-[#a3301e]">{issues.when}</p>}
        </Card>
        <Card title="Ingredients to name in the note">
          <div className="flex flex-wrap gap-1.5">
            {common.meta.ingredients.map((i) => {
              const on = r.ingredientKeys.includes(i.key);
              return (
                <button
                  key={i.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("ingredientKeys", on ? r.ingredientKeys.filter((k) => k !== i.key) : [...r.ingredientKeys, i.key])}
                  className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-forest bg-forest text-white" : "border-line bg-white text-forest hover:bg-cream"}`}
                >
                  {i.name}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </EditorShell>
  );
}
