"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AssistedSettings } from "@/chat/settings";
import { saveAssistedSettingsAction } from "@/app/admin/actions";
import { Card, Field, btn, inputCls } from "./ui";

function Choice<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint: string; disabled?: boolean }[];
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${value === o.value ? "border-forest bg-sage/40" : "border-line bg-white"} ${o.disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input type="radio" name={name} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className="mt-1 accent-forest" />
          <span>
            <span className="block font-medium text-forest">{o.label}</span>
            <span className="text-xs text-muted">{o.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-forest">{label}</p>
      {children}
    </div>
  );
}

export function AssistedSettingsForm({ initial, canEdit, hasKey }: { initial: AssistedSettings; canEdit: boolean; hasKey: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const builtin = s.provider === "builtin";

  return (
    <Card title="Settings" actions={<span className="text-xs text-muted">Apply to chats started after saving. No publish needed.</span>}>
      <fieldset disabled={!canEdit} className="space-y-6">
        <label className="flex items-center gap-3 text-sm text-forest">
          <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="h-4 w-4 accent-forest" />
          <span>
            <span className="font-medium">Show “Chat with an advisor” on the welcome screen</span>
            <span className="block text-xs text-muted">Turning this off hides the option; chats already in progress can still finish.</span>
          </span>
        </label>

        <Group label="AI provider">
          <Choice
            name="provider"
            value={s.provider}
            onChange={(provider) => setS({ ...s, provider })}
            options={[
              { value: "groq", label: "Groq (free tier)", hint: hasKey ? "Uses GROQ_API_KEY. Falls back to built-in if the limit is hit." : "GROQ_API_KEY isn't set on the server yet — chats will use built-in until it is." },
              { value: "builtin", label: "Built-in (no AI)", hint: "Free forever. Understands common replies; asks again with options when unsure." },
            ]}
          />
        </Group>

        <Group label="Conversation mode">
          <Choice
            name="mode"
            value={builtin ? "hybrid" : s.mode}
            onChange={(mode) => setS({ ...s, mode })}
            options={[
              { value: "hybrid", label: "Hybrid", hint: "The rules engine picks each question; AI only understands replies. Most predictable." },
              { value: "full", label: "Full AI", hint: builtin ? "Needs an AI provider." : "AI leads the conversation and can combine questions. The engine still validates answers and decides safety.", disabled: builtin },
            ]}
          />
        </Group>

        <Group label="How people answer">
          <Choice
            name="input"
            value={s.input}
            onChange={(input) => setS({ ...s, input })}
            options={[
              { value: "chips", label: "Text + suggestion chips", hint: "Tap an answer or type. Faster on phones, and taps don't use AI requests." },
              { value: "text", label: "Text only", hint: "A pure chat: people type every reply." },
            ]}
          />
        </Group>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Groq model" hint="Exactly as Groq lists it. Recommended: openai/gpt-oss-120b (strict JSON support)." error={issues.model}>
            <input value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} className={inputCls} disabled={builtin || !canEdit} />
          </Field>
          <Field label="Daily AI request cap" hint="Keeps usage inside the free tier. Above it, chats continue on built-in understanding." error={issues.dailyAiCap}>
            <input type="number" min={0} value={s.dailyAiCap} onChange={(e) => setS({ ...s, dailyAiCap: Number(e.target.value) })} className={inputCls} disabled={builtin || !canEdit} />
          </Field>
        </div>
      </fieldset>

      {canEdit ? (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            className={btn("primary")}
            onClick={() =>
              start(async () => {
                const r = await saveAssistedSettingsAction({ ...s, mode: builtin ? "hybrid" : s.mode });
                if (r.ok) {
                  setIssues({});
                  setMsg("Saved.");
                  router.refresh();
                } else {
                  setIssues(Object.fromEntries((r.issues ?? []).map((i) => [i.path, i.message])));
                  setMsg(r.error);
                }
              })
            }
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
          <span role="status" className="text-sm text-teal-deep">
            {msg}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">Only admins can change these settings.</p>
      )}
    </Card>
  );
}
