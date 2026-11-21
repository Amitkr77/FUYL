"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EngineSettings } from "@/engine";
import { saveSettingsAction } from "@/app/admin/actions";
import { Card, Field, btn, inputCls } from "./ui";

export function SettingsForm({ initial, canEdit }: { initial: EngineSettings; canEdit: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Card>
      <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Question cap" hint="After this many answers, follow-up questions are skipped. Core and safety questions are always asked." error={issues.questionCap}>
          <input type="number" value={s.questionCap} onChange={(e) => setS({ ...s, questionCap: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Focus areas on the result" error={issues.topAreas}>
          <input type="number" value={s.topAreas} onChange={(e) => setS({ ...s, topAreas: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Ingredients per focus area" error={issues.ingredientsPerArea}>
          <input type="number" value={s.ingredientsPerArea} onChange={(e) => setS({ ...s, ingredientsPerArea: Number(e.target.value) })} className={inputCls} />
        </Field>
        <div />
        <Field label="“High match” from (%)" error={issues["bands.high"] ?? issues.bands}>
          <input type="number" value={Math.round(s.bands.high * 100)} onChange={(e) => setS({ ...s, bands: { ...s.bands, high: Number(e.target.value) / 100 } })} className={inputCls} />
        </Field>
        <Field label="“Moderate match” from (%)" hint="Anything above 0 and below this is “Mild”." error={issues["bands.moderate"]}>
          <input type="number" value={Math.round(s.bands.moderate * 100)} onChange={(e) => setS({ ...s, bands: { ...s.bands, moderate: Number(e.target.value) / 100 } })} className={inputCls} />
        </Field>
      </fieldset>
      {canEdit ? (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            className={btn("primary")}
            onClick={() =>
              start(async () => {
                const r = await saveSettingsAction(s);
                if (r.ok) {
                  setIssues({});
                  setMsg("Saved to draft.");
                  router.refresh();
                } else {
                  setIssues(Object.fromEntries((r.issues ?? []).map((i) => [i.path, i.message])));
                  setMsg(r.error);
                }
              })
            }
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
          <span role="status" className="text-sm text-teal-deep">
            {msg}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">Only admins can change engine settings.</p>
      )}
    </Card>
  );
}
