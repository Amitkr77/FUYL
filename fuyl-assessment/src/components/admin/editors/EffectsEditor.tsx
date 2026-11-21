"use client";

import { Plus, X } from "lucide-react";
import type { Effect } from "@/engine";
import { inputCls } from "../ui";
import type { EditorMeta } from "./meta";

/** Score effects: which focus areas an answer pushes up (or down), and by how much. */
export function EffectsEditor({ value, onChange, meta }: { value: Effect[] | undefined; onChange: (v: Effect[] | undefined) => void; meta: EditorMeta }) {
  const list = value ?? [];
  const set = (next: Effect[]) => onChange(next.length ? next : undefined);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.map((e, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pl-2 pr-1 text-xs">
          <select
            value={e.area}
            onChange={(ev) => set(list.map((x, j) => (j === i ? { ...x, area: ev.target.value } : x)))}
            className="bg-transparent text-xs outline-none"
            aria-label="Focus area"
          >
            {meta.areas.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={e.weight}
            min={-20}
            max={20}
            onChange={(ev) => set(list.map((x, j) => (j === i ? { ...x, weight: Number(ev.target.value) } : x)))}
            className="w-12 bg-transparent text-right text-xs tabular-nums outline-none"
            aria-label="Weight"
          />
          <button type="button" onClick={() => set(list.filter((_, j) => j !== i))} className="rounded-full p-0.5 text-muted hover:text-forest" aria-label="Remove effect">
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => set([...list, { area: meta.areas[0]?.key ?? "", weight: 1 }])}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-teal-deep hover:bg-cream"
      >
        <Plus className="h-3 w-3" aria-hidden /> score
      </button>
    </div>
  );
}

export function FlagsInput({ value, onChange, meta }: { value: string[] | undefined; onChange: (v: string[] | undefined) => void; meta: EditorMeta }) {
  return (
    <>
      <input
        list="flag-suggestions"
        value={(value ?? []).join(", ")}
        onChange={(e) => {
          const flags = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(flags.length ? flags : undefined);
        }}
        placeholder="e.g. pregnant, med_thyroid"
        className={`${inputCls} text-xs`}
        aria-label="Safety flags"
      />
      <datalist id="flag-suggestions">
        {meta.flags.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  );
}
