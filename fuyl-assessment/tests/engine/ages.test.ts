import { describe, expect, it } from "vitest";
import { ageGroupOf, buildResult, refForAge, type Answers } from "@/engine";
import { seedKnowledgeBase, withReferenceDefaults } from "@/kb";

const kb = seedKnowledgeBase();
const nutrient = (key: string) => kb.ingredients.find((i) => i.key === key)!.nutrient!;

describe("daily needs by age group", () => {
  it("maps ages to groups (unknown → 31–50)", () => {
    expect([undefined, 19, 30, 31, 50, 51, 70, 71, 95].map(ageGroupOf)).toEqual(["31-50", "19-30", "19-30", "31-50", "31-50", "51-70", "51-70", "71+", "71+"]);
  });

  it("only global values change with age; India's adult values stay the same", () => {
    expect(refForAge(nutrient("iron"), "51-70").global.female).toBe(8);
    expect(refForAge(nutrient("iron"), "31-50").global.female).toBe(18);
    expect(refForAge(nutrient("iron"), "51-70").india).toEqual(nutrient("iron").india);
    expect(refForAge(nutrient("vitamin-d3"), "71+").global.male).toBe(800);
    expect(refForAge(nutrient("magnesium"), "19-30").global).toEqual({ male: 400, female: 310 });
    expect(refForAge(nutrient("vitamin-c"), "71+")).toEqual({ india: nutrient("vitamin-c").india, global: nutrient("vitamin-c").global });
  });

  it("the report uses the person's own age group", () => {
    const base: Answers = { name: { text: "Asha" }, sex: { values: ["female"] }, pregnancy: { values: ["no"] }, priorities: { values: ["energy"] } };
    const at = (age: number) => buildResult(kb, { ...base, age: { number: age } }).nutrients!;
    expect(at(60).ageGroup).toBe("51-70");
    expect(at(60).rows.find((r) => r.key === "iron")!.global).toBe(8);
    expect(at(35).rows.find((r) => r.key === "iron")!.global).toBe(18);
  });

  it("live knowledge bases without age values get the built-in ones", () => {
    const old = { ...kb, ingredients: kb.ingredients.map((i) => (i.nutrient ? { ...i, nutrient: { ...i.nutrient, byAge: undefined } } : i)) };
    expect(withReferenceDefaults(old).ingredients.find((i) => i.key === "iron")!.nutrient!.byAge?.["51-70"]).toBeDefined();
  });
});
