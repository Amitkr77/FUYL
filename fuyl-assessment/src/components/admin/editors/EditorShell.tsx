"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Save, Trash2 } from "lucide-react";
import { deleteEntityAction, saveEntityAction, setReviewAction } from "@/app/admin/actions";
import type { EntityType } from "@/kb/schema";
import { Badge, btn } from "../ui";

export type Issues = Record<string, string>;

/**
 * Shared chrome for every content editor: save to draft, approve, delete,
 * field-level errors, and where the item is referenced.
 */
export function EditorShell({
  type,
  originalKey,
  value,
  review,
  references,
  canDelete,
  onIssues,
  children,
}: {
  type: EntityType;
  originalKey: string | null;
  value: { key: string };
  review?: { status: string; by?: string; at?: string };
  references: string[];
  canDelete: boolean;
  onIssues: (issues: Issues) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  function save(approveAfter = false) {
    setMessage(null);
    start(async () => {
      const r = await saveEntityAction(type, originalKey, value);
      if (!r.ok) {
        onIssues(Object.fromEntries((r.issues ?? []).map((i) => [i.path, i.message])));
        setMessage({ tone: "error", text: r.error });
        return;
      }
      onIssues({});
      if (approveAfter) await setReviewAction([{ type, key: r.key }], "approved");
      setDirty(false);
      setMessage({ tone: "ok", text: approveAfter ? "Saved and approved." : "Saved to draft — needs review before publishing." });
      if (r.key !== originalKey) router.replace(`/admin/content/${type}/${r.key}`);
      else router.refresh();
    });
  }

  function approve() {
    if (!originalKey) return;
    start(async () => {
      const r = await setReviewAction([{ type, key: originalKey }], "approved");
      setMessage(r.ok ? { tone: "ok", text: "Approved." } : { tone: "error", text: r.error });
      router.refresh();
    });
  }

  function remove() {
    if (!originalKey || !confirm(`Delete "${originalKey}" from the draft? This can't be undone (until you restore a published version).`)) return;
    start(async () => {
      const r = await deleteEntityAction(type, originalKey);
      if (!r.ok) setMessage({ tone: "error", text: r.error });
      else router.replace(`/admin/content/${type}`);
    });
  }

  return (
    <div onChangeCapture={() => setDirty(true)} onClickCapture={(e) => (e.target as HTMLElement).closest("[data-edit]") && setDirty(true)}>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {originalKey ? (
          review?.status === "approved" ? (
            <Badge tone="good">Approved{review.by ? ` by ${review.by}` : ""}</Badge>
          ) : (
            <Badge tone="warn">Needs review</Badge>
          )
        ) : (
          <Badge tone="info">New</Badge>
        )}
        {references.length > 0 && <span className="text-xs text-muted">Used by {references.length}: {references.slice(0, 4).join(", ")}{references.length > 4 ? "…" : ""}</span>}
      </div>

      {children}

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line/60 bg-[#f7f9f3]/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending} onClick={() => save(false)} className={btn("primary")}>
            <Save className="h-4 w-4" aria-hidden /> {pending ? "Saving…" : "Save draft"}
          </button>
          <button type="button" disabled={pending} onClick={() => save(true)} className={btn("secondary")}>
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Save &amp; approve
          </button>
          {originalKey && review?.status !== "approved" && !dirty && (
            <button type="button" disabled={pending} onClick={approve} className={btn("ghost")}>
              Approve as is
            </button>
          )}
          {originalKey && canDelete && (
            <button type="button" disabled={pending} onClick={remove} className={`${btn("danger")} ml-auto`}>
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
          )}
        </div>
        <p role="status" aria-live="polite" className={`mt-2 min-h-5 whitespace-pre-line text-sm ${message?.tone === "error" ? "text-[#a3301e]" : "text-teal-deep"}`}>
          {message?.text ?? (dirty ? "Unsaved changes" : "")}
        </p>
      </div>
    </div>
  );
}

/** Small helper for list editors: comma-separated input ⇄ string[]. */
export const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
