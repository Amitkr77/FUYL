"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btn } from "./ui";

type Result = { ok: true; [k: string]: unknown } | { ok: false; error: string };

/**
 * A button that runs a server action (props must be serialisable — it is
 * rendered from Server Components), shows progress, optional confirmation,
 * and the outcome. Refreshes the page data on success.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirmText,
  variant = "secondary",
  size = "md",
  successText,
}: {
  action: () => Promise<Result>;
  label: React.ReactNode;
  pendingLabel?: string;
  confirmText?: string;
  variant?: Parameters<typeof btn>[0];
  size?: Parameters<typeof btn>[1];
  /** Shown on success. `{field}` is replaced by that field of the action result, e.g. "Sync {status}." */
  successText?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={btn(variant, size)}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          setMsg(null);
          start(async () => {
            const r = await action();
            if (r.ok) {
              const text = successText?.replace(/\{(\w+)\}/g, (_, k: string) => String((r as Record<string, unknown>)[k] ?? ""));
              if (text) setMsg({ ok: true, text });
              router.refresh();
            } else setMsg({ ok: false, text: r.error });
          });
        }}
      >
        {pending ? (pendingLabel ?? "Working…") : label}
      </button>
      {msg && <span className={`max-w-md whitespace-pre-line text-xs ${msg.ok ? "text-teal-deep" : "text-[#a3301e]"}`}>{msg.text}</span>}
    </span>
  );
}
