import { describe, expect, it } from "vitest";
import { buildResult, maxScores, type Answers } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import { KnowledgeBaseSchema } from "@/kb/schema";

const kb = seedKnowledgeBase();

const base: Answers = {
  name: { text: "Riya" },
  sex: { values: ["female"] },
  age: { number: 31 },
  pregnancy: { values: ["no"] },
  diet: { values: ["veg"] },
};

describe("no selection limits", () => {
  it("the seed has no maxSelect caps, and still validates", () => {
    expect(kb.questions.filter((q) => q.maxSelect)).toEqual([]);
    expect(KnowledgeBaseSchema.safeParse(kb).success).toBe(true);
  });

  it("match % stays calibrated: scoreTop caps what counts toward the maximum", () => {
    const capped = maxScores(kb);
    const uncapped = maxScores({ ...kb, questions: kb.questions.map((q) => ({ ...q, scoreTop: undefined })) });
    // Without scoreTop, picking-everything would inflate the maximum and shrink everyone's %.
    expect(Object.keys(capped).some((a) => uncapped[a] > capped[a])).toBe(true);
  });

  it("every priority the user picks appears in the report, even more than topAreas", () => {
    const picks = ["energy", "gut", "immunity", "stress", "sleep"];
    const r = buildResult(kb, { ...base, priorities: { values: picks } });
    const shown = r.areas.filter((a) => a.isPriority).length;
    expect(shown).toBeGreaterThanOrEqual(5);
    expect(r.areas.length).toBeGreaterThan(kb.settings.topAreas);
  });
});

describe("India vs global nutrient comparison", () => {
  it("covers all 19 vitamins and minerals with per-sex values", () => {
    const r = buildResult(kb, { ...base, priorities: { values: ["energy"] } });
    expect(r.nutrients?.basis).toBe("female");
    expect(r.nutrients?.rows).toHaveLength(19);
    const iron = r.nutrients!.rows.find((x) => x.key === "iron")!;
    expect(iron).toMatchObject({ amount: 3, unit: "mg", india: 29, global: 18 });
    expect(iron.indiaPct).toBe(10);
  });

  it("men's India values reproduce the %RDA printed on the label", () => {
    const r = buildResult(kb, { ...base, sex: { values: ["male"] }, pregnancy: undefined as never, priorities: { values: ["energy"] } });
    for (const row of r.nutrients!.rows) {
      const label = kb.ingredients.find((i) => i.key === row.key)!.rda!;
      expect(Math.abs(row.indiaPct - label)).toBeLessThanOrEqual(1);
    }
  });

  it("'prefer not to say' uses the higher (stricter) value of the two", () => {
    const r = buildResult(kb, { ...base, sex: { values: ["na"] }, priorities: { values: ["energy"] } });
    expect(r.nutrients?.basis).toBe("adult");
    expect(r.nutrients!.rows.find((x) => x.key === "iron")!.india).toBe(29);
  });
});

describe("summary of findings", () => {
  it("leads with the focus areas, then safety, nutrition and ingredients", () => {
    const r = buildResult(kb, { ...base, priorities: { values: ["energy", "sleep"] } });
    expect(r.findings!.headline).toMatch(/^Riya, your top focus areas are /);
    const kinds = r.findings!.points.map((p) => p.kind);
    expect(kinds).toContain("focus");
    expect(kinds).toContain("safety");
    expect(kinds).toContain("nutrition");
    expect(r.findings!.points.find((p) => p.kind === "safety")!.text).toBe("No safety concerns came up in your answers.");
  });

  it("names doctor checks when a consult rule fires", () => {
    const r = buildResult(kb, {
      ...base,
      priorities: { values: ["energy"] },
      health_gate: { values: ["yes"] },
      conditions: { values: ["thyroid"] },
      medications: { values: ["thyroid"] },
    });
    expect(r.findings!.points.find((p) => p.kind === "safety")!.text).toMatch(/^Check with your doctor before starting:/);
  });
});

describe("report visuals data", () => {
  const r = buildResult(kb, { ...base, priorities: { values: ["energy", "sleep"] }, checkin: { values: ["tired", "sleep"] } });

  it("profile covers every focus area with a 0–100 match, flagging the ones in the report", () => {
    expect(r.profile).toHaveLength(kb.areas.length);
    for (const p of r.profile!) expect(p.match).toBeGreaterThanOrEqual(0), expect(p.match).toBeLessThanOrEqual(100);
    const shown = r.profile!.filter((p) => p.shown).map((p) => p.key).sort();
    expect(shown).toEqual(r.areas.map((a) => a.key).sort());
    // The profile's % for a shown area equals the area card's %.
    for (const a of r.areas) expect(r.profile!.find((p) => p.key === a.key)!.match).toBe(a.match);
  });

  it("blends are ranked by mg, skip 'Other Ingredients', and count the ingredients matched to the person", () => {
    const mg = r.blends!.filter((b) => b.mg).map((b) => b.mg!);
    expect(mg).toEqual([...mg].sort((a, b) => b - a));
    expect(r.blends!.some((b) => b.name === "Other Ingredients")).toBe(false);
    const totalForYou = r.blends!.reduce((s, b) => s + b.forYou, 0);
    expect(totalForYou).toBe(r.coverage.ingredientCount);
    expect(r.blends!.find((b) => b.name === "Probiotics")!.mg).toBeUndefined();
  });

  it("each nutrient row carries both sexes' India and global needs, and its kind", () => {
    const iron = r.nutrients!.rows.find((x) => x.key === "iron")!;
    expect(iron.ref).toEqual({ india: { male: 19, female: 29 }, global: { male: 8, female: 18 } });
    expect(iron.kind).toBe("mineral");
    expect(r.nutrients!.rows.find((x) => x.key === "vitamin-c")!.kind).toBe("vitamin");
    expect(r.nutrients!.rows.filter((x) => x.kind === "mineral")).toHaveLength(6);
  });
});
