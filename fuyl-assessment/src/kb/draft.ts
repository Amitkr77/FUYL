import type { KnowledgeBase } from "@/engine";
import { ENTITY_COLLECTION, ENTITY_SCHEMA, type EntityType } from "./schema";

/**
 * Pure helpers for editing a knowledge-base draft. No I/O — the admin's
 * server actions load the draft, call these, and save the result.
 */

export type ReviewStatus = "draft" | "approved";
export interface Review {
  status: ReviewStatus;
  by?: string;
  at?: string; // ISO
}
export type Reviews = Record<string, Review>;

export const reviewKey = (type: EntityType, key: string) => `${type}:${key}`;

type Entity = { key: string };

export function listEntities(kb: KnowledgeBase, type: EntityType): Entity[] {
  return kb[ENTITY_COLLECTION[type]] as Entity[];
}

export function getEntity(kb: KnowledgeBase, type: EntityType, key: string): Entity | undefined {
  return listEntities(kb, type).find((e) => e.key === key);
}

export type EditResult = { ok: true; kb: KnowledgeBase } | { ok: false; error: string; issues?: { path: string; message: string }[] };

/**
 * Validate and upsert one entity. `originalKey` supports renaming; a rename is
 * propagated to every reference (conditions, area links, safety rules, review
 * map) so nothing silently breaks.
 */
export function upsertEntity(kb: KnowledgeBase, type: EntityType, input: unknown, originalKey?: string): EditResult {
  const parsed = ENTITY_SCHEMA[type].safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const entity = parsed.data as Entity;
  const list = listEntities(kb, type);
  const fromKey = originalKey ?? entity.key;
  const exists = list.some((e) => e.key === fromKey);
  if (entity.key !== fromKey && list.some((e) => e.key === entity.key)) {
    return { ok: false, error: `Another ${type} already uses the key "${entity.key}".` };
  }
  if (!originalKey && list.some((e) => e.key === entity.key)) {
    return { ok: false, error: `A ${type} with the key "${entity.key}" already exists.` };
  }

  const nextList = exists ? list.map((e) => (e.key === fromKey ? entity : e)) : [...list, entity];
  let next: KnowledgeBase = { ...kb, [ENTITY_COLLECTION[type]]: nextList };
  if (originalKey && originalKey !== entity.key) next = renameReferences(next, type, originalKey, entity.key);
  return { ok: true, kb: next };
}

export function deleteEntity(kb: KnowledgeBase, type: EntityType, key: string): EditResult {
  const refs = findReferences(kb, type, key);
  if (refs.length) return { ok: false, error: `Still used by: ${refs.slice(0, 5).join(", ")}${refs.length > 5 ? "…" : ""}. Remove those references first.` };
  return { ok: true, kb: { ...kb, [ENTITY_COLLECTION[type]]: listEntities(kb, type).filter((e) => e.key !== key) } };
}

/** Human-readable list of places that reference an entity. */
export function findReferences(kb: KnowledgeBase, type: EntityType, key: string): string[] {
  const out: string[] = [];
  const json = (v: unknown) => JSON.stringify(v ?? null);
  if (type === "question") {
    const pat = new RegExp(`"(answer|answered|number)":"${escapeRe(key)}"`);
    kb.questions.forEach((q) => q.key !== key && pat.test(json(q.showIf)) && out.push(`question “${q.key}”`));
    kb.safetyRules.forEach((r) => pat.test(json(r.when)) && out.push(`safety rule “${r.key}”`));
  }
  if (type === "ingredient") {
    kb.areas.forEach((a) => a.ingredients.some((i) => i.key === key) && out.push(`focus area “${a.name}”`));
    kb.safetyRules.forEach((r) => r.ingredientKeys.includes(key) && out.push(`safety rule “${r.key}”`));
  }
  if (type === "area") {
    kb.questions.forEach((q) => {
      const effects = [...(q.options ?? []).flatMap((o) => o.effects ?? []), ...(q.bands ?? []).flatMap((b) => b.effects ?? [])];
      if (effects.some((e) => e.area === key) || new RegExp(`"score":"${escapeRe(key)}"`).test(json(q.showIf))) out.push(`question “${q.key}”`);
    });
  }
  return out;
}

function renameReferences(kb: KnowledgeBase, type: EntityType, from: string, to: string): KnowledgeBase {
  const swapCond = <T>(v: T, field: string[]): T => {
    if (v === undefined) return v;
    let s = JSON.stringify(v);
    for (const f of field) s = s.replaceAll(`"${f}":"${from}"`, `"${f}":"${to}"`);
    return JSON.parse(s) as T;
  };
  if (type === "question") {
    return {
      ...kb,
      questions: kb.questions.map((q) => ({ ...q, showIf: swapCond(q.showIf, ["answer", "answered", "number"]) })),
      safetyRules: kb.safetyRules.map((r) => ({ ...r, when: swapCond(r.when, ["answer", "answered", "number"]) })),
    };
  }
  if (type === "ingredient") {
    return {
      ...kb,
      areas: kb.areas.map((a) => ({ ...a, ingredients: a.ingredients.map((i) => (i.key === from ? { ...i, key: to } : i)) })),
      safetyRules: kb.safetyRules.map((r) => ({ ...r, ingredientKeys: r.ingredientKeys.map((k) => (k === from ? to : k)) })),
    };
  }
  if (type === "area") {
    const fixEffects = <T extends { effects?: { area: string; weight: number }[] }>(x: T): T =>
      x.effects ? { ...x, effects: x.effects.map((e) => (e.area === from ? { ...e, area: to } : e)) } : x;
    return {
      ...kb,
      questions: kb.questions.map((q) => ({
        ...q,
        options: q.options?.map(fixEffects),
        bands: q.bands?.map(fixEffects),
        showIf: swapCond(q.showIf, ["score"]),
      })),
    };
  }
  return kb;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Reviews ────────────────────────────────────────────────────────────────

/** Mark an entity as needing review again (after an edit). */
export function markDraft(reviews: Reviews, type: EntityType, key: string, originalKey?: string): Reviews {
  const next = { ...reviews };
  if (originalKey && originalKey !== key) delete next[reviewKey(type, originalKey)];
  next[reviewKey(type, key)] = { status: "draft" };
  return next;
}

export interface ReviewCounts {
  total: number;
  approved: number;
  pending: { type: EntityType; key: string }[];
}

export function reviewCounts(kb: KnowledgeBase, reviews: Reviews): ReviewCounts {
  const pending: { type: EntityType; key: string }[] = [];
  let total = 0;
  for (const type of Object.keys(ENTITY_COLLECTION) as EntityType[]) {
    for (const e of listEntities(kb, type)) {
      total++;
      if (reviews[reviewKey(type, e.key)]?.status !== "approved") pending.push({ type, key: e.key });
    }
  }
  return { total, approved: total - pending.length, pending };
}

// ─── Diff (draft vs live) ───────────────────────────────────────────────────

export interface DiffEntry {
  type: EntityType | "settings";
  key: string;
  change: "added" | "removed" | "changed";
}

export function diffKnowledgeBases(live: KnowledgeBase, draft: KnowledgeBase): DiffEntry[] {
  const out: DiffEntry[] = [];
  for (const type of Object.keys(ENTITY_COLLECTION) as EntityType[]) {
    const a = new Map(listEntities(live, type).map((e) => [e.key, JSON.stringify(e)]));
    const b = new Map(listEntities(draft, type).map((e) => [e.key, JSON.stringify(e)]));
    for (const [k, v] of b) if (!a.has(k)) out.push({ type, key: k, change: "added" });
    else if (a.get(k) !== v) out.push({ type, key: k, change: "changed" });
    for (const k of a.keys()) if (!b.has(k)) out.push({ type, key: k, change: "removed" });
  }
  if (JSON.stringify(live.settings) !== JSON.stringify(draft.settings)) out.push({ type: "settings", key: "settings", change: "changed" });
  return out;
}
