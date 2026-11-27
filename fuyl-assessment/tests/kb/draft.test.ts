import { describe, expect, it } from "vitest";
import { checkKnowledgeBase } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import { deleteEntity, diffKnowledgeBases, findReferences, markDraft, reviewCounts, upsertEntity } from "@/kb/draft";
import { KnowledgeBaseSchema, QuestionSchema } from "@/kb/schema";

const kb = seedKnowledgeBase();

describe("schema", () => {
  it("accepts the entire seed knowledge base", () => {
    const r = KnowledgeBaseSchema.safeParse(kb);
    if (!r.success) console.log(r.error.issues.slice(0, 5));
    expect(r.success).toBe(true);
  });

  it("rejects bad keys, single-option questions and unknown fields", () => {
    const base = { key: "x", block: "feel", order: 1, type: "single", tier: "core", prompt: "Q?", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] };
    expect(QuestionSchema.safeParse(base).success).toBe(true);
    expect(QuestionSchema.safeParse({ ...base, key: "Has Space" }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...base, options: [{ value: "a", label: "A" }] }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...base, evil: "<script>" }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...base, showIf: { answer: "sex", in: [] } }).success).toBe(false);
  });
});

describe("upsertEntity", () => {
  it("edits a question and keeps the KB valid", () => {
    const sleep = kb.questions.find((q) => q.key === "sleep")!;
    const r = upsertEntity(kb, "question", { ...sleep, prompt: "How do you sleep?" }, "sleep");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kb.questions.find((q) => q.key === "sleep")!.prompt).toBe("How do you sleep?");
  });

  it("returns field-level issues for invalid input", () => {
    const r = upsertEntity(kb, "ingredient", { key: "x", name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues?.some((i) => i.path === "name")).toBe(true);
  });

  it("refuses duplicate keys on create and rename", () => {
    expect(upsertEntity(kb, "ingredient", { key: "iron", name: "Iron 2" }).ok).toBe(false);
    const zinc = kb.ingredients.find((i) => i.key === "zinc")!;
    expect(upsertEntity(kb, "ingredient", { ...zinc, key: "iron" }, "zinc").ok).toBe(false);
  });

  it("propagates a rename to every reference", () => {
    const q = kb.questions.find((x) => x.key === "diet")!;
    const r = upsertEntity(kb, "question", { ...q, key: "eating" }, "diet");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Grid rows' conditions follow the rename too.
    expect(JSON.stringify(r.kb.questions.find((x) => x.key === "diet_week")!.rows)).toContain('"answer":"eating"');
    expect(checkKnowledgeBase(r.kb).filter((i) => i.severity === "error")).toEqual([]);

    const ing = kb.ingredients.find((x) => x.key === "ashwagandha")!;
    const r2 = upsertEntity(kb, "ingredient", { ...ing, key: "ksm66" }, "ashwagandha");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.kb.areas.find((a) => a.key === "stress")!.ingredients[0].key).toBe("ksm66");
    expect(r2.kb.safetyRules.find((s) => s.key === "thyroid")!.ingredientKeys).toContain("ksm66");
    expect(checkKnowledgeBase(r2.kb).filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("deleteEntity / findReferences", () => {
  it("blocks deleting something still referenced", () => {
    expect(findReferences(kb, "ingredient", "ashwagandha").length).toBeGreaterThan(3);
    expect(deleteEntity(kb, "ingredient", "ashwagandha").ok).toBe(false);
    expect(deleteEntity(kb, "question", "diet").ok).toBe(false); // the diet grid's rows depend on it
    expect(deleteEntity(kb, "question", "diet_week").ok).toBe(false); // food groups depend on it
  });

  it("deletes an unreferenced entity", () => {
    const r = deleteEntity(kb, "ingredient", "xanthan-gum");
    expect(r.ok && r.kb.ingredients.length).toBe(59);
  });
});

describe("reviews and diff", () => {
  it("counts pending reviews and re-marks edited entities as draft", () => {
    const approvedAll = Object.fromEntries(
      [...kb.questions.map((q) => `question:${q.key}`), ...kb.areas.map((a) => `area:${a.key}`), ...kb.ingredients.map((i) => `ingredient:${i.key}`), ...kb.safetyRules.map((s) => `safety:${s.key}`)].map(
        (k) => [k, { status: "approved" as const }],
      ),
    );
    expect(reviewCounts(kb, approvedAll).pending).toEqual([]);
    const after = markDraft(approvedAll, "question", "sleep");
    expect(reviewCounts(kb, after).pending).toEqual([{ type: "question", key: "sleep" }]);
    expect(reviewCounts(kb, {}).approved).toBe(0);
  });

  it("diffs draft against live", () => {
    const r = upsertEntity(kb, "ingredient", { key: "new-thing", name: "New thing" });
    if (!r.ok) throw new Error();
    const d = deleteEntity(r.kb, "ingredient", "xanthan-gum");
    if (!d.ok) throw new Error();
    const changed = { ...d.kb, settings: { ...d.kb.settings, topAreas: 4 } };
    expect(diffKnowledgeBases(kb, changed)).toEqual(
      expect.arrayContaining([
        { type: "ingredient", key: "new-thing", change: "added" },
        { type: "ingredient", key: "xanthan-gum", change: "removed" },
        { type: "settings", key: "settings", change: "changed" },
      ]),
    );
  });
});
