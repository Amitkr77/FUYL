import "server-only";
import { checkKnowledgeBase, type KnowledgeBase } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import { reviewCounts, type Reviews } from "@/kb/draft";
import { KnowledgeBaseSchema } from "@/kb/schema";
import { connectDB } from "@/lib/db";
import { invalidateKnowledgeBaseCache } from "@/lib/kb";
import { KbDraft, KbVersion } from "@/models/admin";

/**
 * Knowledge-base persistence: one editable draft and immutable published
 * versions. The first time it's needed, the draft is created from the latest
 * published version — or, on a fresh install, from the drafted seed KB.
 */

export interface DraftState {
  kb: KnowledgeBase;
  reviews: Reviews;
  basedOnVersion: number;
  updatedAt?: Date;
  updatedBy?: string;
}

export async function getDraft(): Promise<DraftState> {
  await connectDB();
  let doc = await KbDraft.findById("draft").lean();
  if (!doc) {
    const latest = await KbVersion.findOne().sort({ version: -1 }).lean();
    const kb = (latest?.kb as KnowledgeBase | undefined) ?? seedKnowledgeBase();
    await KbDraft.updateOne(
      { _id: "draft" },
      { $setOnInsert: { kb, reviews: latest?.reviews ?? {}, basedOnVersion: latest?.version ?? 0 } },
      { upsert: true },
    );
    doc = await KbDraft.findById("draft").lean();
  }
  return {
    kb: doc!.kb as KnowledgeBase,
    reviews: (doc!.reviews ?? {}) as Reviews,
    basedOnVersion: doc!.basedOnVersion ?? 0,
    updatedAt: doc!.updatedAt as Date | undefined,
    updatedBy: doc!.updatedBy ?? undefined,
  };
}

export async function saveDraft(kb: KnowledgeBase, reviews: Reviews, actor: string): Promise<void> {
  await connectDB();
  await KbDraft.updateOne({ _id: "draft" }, { $set: { kb, reviews, updatedBy: actor } }, { upsert: true });
}

export async function getLatestVersion() {
  await connectDB();
  return KbVersion.findOne().sort({ version: -1 }).lean();
}

export async function listVersions(limit = 30) {
  await connectDB();
  return KbVersion.find({}, { kb: 0, reviews: 0 }).sort({ version: -1 }).limit(limit).lean();
}

export type PublishResult = { ok: true; version: number } | { ok: false; error: string; details?: string[] };

/**
 * Publish the draft as a new immutable version. Blocked if the KB checker
 * reports errors or if any entity hasn't been approved by a reviewer.
 */
export async function publishDraft(actor: string, note: string): Promise<PublishResult> {
  const draft = await getDraft();
  const parsed = KnowledgeBaseSchema.safeParse(draft.kb);
  if (!parsed.success) return { ok: false, error: "The draft has invalid data.", details: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`) };

  const errors = checkKnowledgeBase(draft.kb).filter((i) => i.severity === "error");
  if (errors.length) return { ok: false, error: `Fix ${errors.length} check error(s) before publishing.`, details: errors.slice(0, 10).map((e) => e.message) };

  const pending = reviewCounts(draft.kb, draft.reviews).pending;
  if (pending.length) return { ok: false, error: `${pending.length} item(s) still need reviewer approval.`, details: pending.slice(0, 10).map((p) => `${p.type}: ${p.key}`) };

  const latest = await getLatestVersion();
  const version = (latest?.version ?? 0) + 1;
  const kb: KnowledgeBase = { ...draft.kb, version };
  await KbVersion.create({ version, kb, reviews: draft.reviews, note: note.trim().slice(0, 300) || undefined, publishedBy: actor });
  await KbDraft.updateOne({ _id: "draft" }, { $set: { kb, basedOnVersion: version, updatedBy: actor } });
  invalidateKnowledgeBaseCache();
  return { ok: true, version };
}

/** Copy a published version back into the draft (then review + publish to roll back). */
export async function restoreVersionToDraft(version: number, actor: string): Promise<boolean> {
  await connectDB();
  const v = await KbVersion.findOne({ version }).lean();
  if (!v) return false;
  await KbDraft.updateOne(
    { _id: "draft" },
    { $set: { kb: v.kb, reviews: v.reviews ?? {}, basedOnVersion: v.version, updatedBy: actor } },
    { upsert: true },
  );
  return true;
}
