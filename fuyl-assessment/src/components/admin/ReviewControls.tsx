"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { publishAction, setReviewAction } from "@/app/admin/actions";
import type { EntityType } from "@/kb/schema";
import { btn, inputCls } from "./ui";

export function ApprovePending({ items }: { items: { type: EntityType; key: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className={btn("secondary")}
        onClick={() => {
          if (!confirm(`Approve all ${items.length} item(s)? Only do this after reviewing each one.`)) return;
          start(async () => {
            const r = await setReviewAction(items, "approved");
            setMsg(r.ok ? null : r.error);
            router.refresh();
          });
        }}
      >
        {pending ? "Approving…" : `Approve all ${items.length}`}
      </button>
      <span className="text-xs text-muted">Or open each item and use “Approve as is”.</span>
      {msg && <span className="text-xs text-[#a3301e]">{msg}</span>}
    </div>
  );
}

export function PublishPanel({ canPublish, nextVersion }: { canPublish: boolean; nextVersion: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="mb-1 block text-xs font-medium text-forest">Release note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Reviewed by Dr. … — updated thyroid rule" className={inputCls} />
      </label>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={!canPublish || pending}
          className={btn("primary")}
          onClick={() => {
            if (!confirm(`Publish v${nextVersion}? It goes live for all new answers immediately.`)) return;
            start(async () => {
              const r = await publishAction(note);
              setMsg(r.ok ? { ok: true, text: `Published v${r.version}.` } : { ok: false, text: r.error });
              if (r.ok) setNote("");
              router.refresh();
            });
          }}
        >
          <Rocket className="h-4 w-4" aria-hidden /> {pending ? "Publishing…" : `Publish v${nextVersion}`}
        </button>
      </div>
      {!canPublish && !msg && <p className="text-xs text-muted sm:self-center">Resolve check errors and approvals first (or make a change).</p>}
      {msg && <p className={`whitespace-pre-line text-sm ${msg.ok ? "text-teal-deep" : "text-[#a3301e]"}`}>{msg.text}</p>}
    </div>
  );
}
