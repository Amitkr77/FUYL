import { describe, expect, it } from "vitest";
import { buildResult, checkKnowledgeBase, nextStep, simulateReachable, type Answer, type Answers, type Question } from "@/engine";
import { seedKnowledgeBase } from "@/kb";

const kb = seedKnowledgeBase();

/**
 * Walk the real KB as a persona. `script` answers specific questions; anything
 * unscripted gets a neutral default (no issues / "none" / "no").
 */
function persona(script: Answers) {
  const answers: Answers = {};
  const asked: string[] = [];
  for (let i = 0; i < 100; i++) {
    const step = nextStep(kb, answers);
    if (step.kind !== "question") return { asked, answers, step, result: buildResult(kb, answers) };
    const q = kb.questions.find((x) => x.key === step.question.key)!;
    asked.push(q.key);
    answers[q.key] = script[q.key] ?? neutral(q);
  }
  throw new Error("persona did not finish");
}

function neutral(q: Question): Answer {
  if (q.type === "text") return { text: "Sam" };
  if (q.type === "number") return { number: 30 };
  const opts = q.options ?? [];
  const pick =
    opts.find((o) => o.exclusive) ??
    opts.find((o) => ["no", "none", "good", "well", "low", "rarely", "sharp", "never", "nonveg", "light", "some", "2-3", "4-5", "<4", "0-1", "daily", "often", "quick"].includes(o.value)) ??
    opts[0];
  return { values: [pick.value] };
}

describe("seed knowledge base — integrity", () => {
  it("has all 60 COMPLETE+ ingredients with unique keys", () => {
    expect(kb.ingredients).toHaveLength(60);
    expect(new Set(kb.ingredients.map((i) => i.key)).size).toBe(60);
    const byBlend = (b: string) => kb.ingredients.filter((i) => i.blend === b).length;
    expect(byBlend("Vitamin-Mineral Premix")).toBe(19); // 13 vitamins + 6 minerals
    expect(byBlend("Other Ingredients")).toBe(7);
    expect(byBlend("Digestive Enzyme Blend (Digezyme®)")).toBe(5);
  });

  it("gives every vitamin and mineral a dose and %RDA from the label", () => {
    for (const i of kb.ingredients.filter((x) => x.blend === "Vitamin-Mineral Premix")) {
      expect(i.dose, i.key).toBeTruthy();
      expect(i.rda, i.key).toBeGreaterThan(0);
    }
  });

  it("passes the knowledge-base checker with no errors", () => {
    const errors = checkKnowledgeBase(kb).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("can reach every question", () => {
    const { seen } = simulateReachable(kb);
    const unreachable = kb.questions.map((q) => q.key).filter((k) => !seen.has(k));
    expect(unreachable).toEqual([]);
  });

  it("gives every focus area at least 4 linked ingredients and 3 tips", () => {
    for (const a of kb.areas) {
      expect(a.ingredients.length, a.key).toBeGreaterThanOrEqual(4);
      expect(a.tips.length, a.key).toBeGreaterThanOrEqual(3);
    }
  });

  it("avoids disease-treatment wording in user-facing copy", () => {
    const banned = /\b(cure|cures|treat|treats|treatment for|prevents?|heals?|relieves?|anxiety relief|detox(es|ify)?)\b/i;
    const copy = [
      ...kb.areas.flatMap((a) => [a.copy, ...a.tips, ...a.ingredients.map((i) => i.why)]),
      ...kb.ingredients.map((i) => i.description ?? ""),
    ];
    const offenders = copy.filter((c) => banned.test(c));
    expect(offenders).toEqual([]);
  });
});

describe("seed knowledge base — personas", () => {
  it("person with no issues takes a short path and still gets a result", () => {
    const { asked, step, result } = persona({ priorities: { values: ["energy"] } });
    expect(step.kind).toBe("complete");
    expect(asked.length).toBeLessThanOrEqual(24);
    expect(result.areas[0].key).toBe("energy");
    expect(result.showProduct).toBe(true);
    expect(result.safety.level).toBe("none");
  });

  it("stressed desk worker: stress and sleep lead", () => {
    const { asked, result } = persona({
      name: { text: "Riya" },
      sex: { values: ["female"] },
      age: { number: 31 },
      pregnancy: { values: ["no"] },
      priorities: { values: ["stress", "sleep"] },
      diet: { values: ["veg"] },
      activity: { values: ["sitting"] },
      screen: { values: ["8+"] },
      caffeine: { values: ["4+"] },
      stress: { values: ["high"] },
      stress_impact: { values: ["sleep", "focus"] },
      sleep: { values: ["falling"] },
      sleep_hours: { values: ["5-6"] },
      sleep_habits: { values: ["screens", "racing"] },
    });
    expect(asked).toContain("pregnancy");
    expect(asked).toContain("periods");
    expect(asked).toContain("stress_impact");
    expect(result.name).toBe("Riya");
    expect(result.areas.slice(0, 2).map((a) => a.key).sort()).toEqual(["sleep", "stress"]);
    expect(result.areas[0].ingredients[0].key).toBe("ashwagandha");
    expect(result.areas.find((a) => a.key === "stress")!.reasons).toContain("You've been under high stress");
  });

  it("vegan runner: fitness and nutrient gaps surface; no female-only questions", () => {
    const { asked, result } = persona({
      sex: { values: ["male"] },
      age: { number: 27 },
      priorities: { values: ["fitness"] },
      diet: { values: ["vegan"] },
      activity: { values: ["intense"] },
      training: { values: ["cardio"] },
      sun: { values: ["rarely"] },
      energy: { values: ["slump"] },
      energy_when: { values: ["afternoon"] },
    });
    expect(asked).not.toContain("pregnancy");
    expect(asked).not.toContain("periods");
    expect(asked).not.toContain("dairy"); // vegans aren't asked about dairy
    const keys = result.areas.map((a) => a.key);
    expect(keys[0]).toBe("fitness");
    expect(keys).toContain("nutrients");
    // B12 matters most for a vegan; each ingredient is listed once, under the
    // highest-ranked area that links it.
    expect(result.areas.flatMap((a) => a.ingredients.map((i) => i.key))).toContain("vitamin-b12");
  });

  it("over-55 unlocks the healthy-ageing deep dive", () => {
    const { asked, result } = persona({ age: { number: 58 }, ageing_signs: { values: ["joints", "bones"] } });
    expect(asked).toContain("ageing_signs");
    expect(result.areas.map((a) => a.key)).toContain("ageing");
  });

  it("weekly drinker unlocks the liver question", () => {
    const { asked, result } = persona({ alcohol: { values: ["weekly"] }, fried: { values: ["most"] } });
    expect(asked).toContain("fried");
    expect(result.areas.map((a) => a.key)).toContain("liver");
  });

  it("an 18-year-old is stopped right after the age question", () => {
    const { asked, step, result } = persona({ age: { number: 18 } });
    expect(step).toMatchObject({ kind: "stopped", rule: { key: "under_19" } });
    expect(asked.at(-1)).toBe("age");
    expect(result.showProduct).toBe(false);
  });

  it("pregnancy stops the assessment", () => {
    const { step } = persona({ sex: { values: ["female"] }, pregnancy: { values: ["pregnant"] } });
    expect(step).toMatchObject({ kind: "stopped", rule: { key: "pregnant" } });
  });

  it("'prefer not to say' on sex is still asked about pregnancy", () => {
    const { asked } = persona({ sex: { values: ["na"] } });
    expect(asked).toContain("pregnancy");
  });

  it("thyroid medicine → consult note naming ashwagandha, iodine and selenium; product still shown", () => {
    const { asked, result } = persona({
      health_gate: { values: ["yes"] },
      conditions: { values: ["thyroid"] },
      medications: { values: ["thyroid"] },
    });
    expect(asked).toEqual(expect.arrayContaining(["conditions", "medications", "surgery"]));
    expect(result.safety.level).toBe("consult");
    const note = result.safety.notes.find((n) => n.key === "thyroid")!;
    expect(note.ingredients).toEqual(["KSM-66® Ashwagandha", "Iodine", "Selenium"]);
    expect(result.showProduct).toBe(true);
  });

  it("'prefer not to say' on health → general consult, no detail questions", () => {
    const { asked, result } = persona({ health_gate: { values: ["pns"] } });
    expect(asked).not.toContain("conditions");
    expect(result.safety.notes.map((n) => n.key)).toContain("undisclosed");
  });

  it("food allergy → info note only", () => {
    const { result } = persona({ allergies: { values: ["yes"] } });
    expect(result.safety.level).toBe("info");
    expect(result.showProduct).toBe(true);
  });

  it("everything-is-wrong persona stays within a reasonable length", () => {
    const { asked, step } = persona({
      sex: { values: ["female"] },
      age: { number: 45 },
      pregnancy: { values: ["no"] },
      priorities: { values: ["energy", "gut", "ageing"] },
      diet: { values: ["veg"] },
      dairy: { values: ["rarely"] },
      activity: { values: ["regular"] },
      training: { values: ["strength", "yoga"] },
      alcohol: { values: ["weekly"] },
      energy: { values: ["tired"] },
      energy_when: { values: ["all-day"] },
      energy_signs: { values: ["hairfall", "cold"] },
      sleep: { values: ["waking"] },
      sleep_hours: { values: ["<5"] },
      sleep_habits: { values: ["racing"] },
      stress: { values: ["high"] },
      stress_impact: { values: ["sleep"] },
      gut: { values: ["issues"] },
      gut_issues: { values: ["bloating"] },
      gut_freq: { values: ["daily"] },
      antibiotics: { values: ["yes"] },
      colds: { values: ["often"] },
      recovery: { values: ["slow"] },
      focus: { values: ["foggy"] },
      focus_type: { values: ["memory"] },
      skin: { values: ["hair"] },
      ageing_signs: { values: ["joints"] },
      fried: { values: ["few"] },
      periods: { values: ["heavy"] },
      health_gate: { values: ["yes"] },
      conditions: { values: ["none"] },
      medications: { values: ["none"] },
      surgery: { values: ["no"] },
    });
    expect(step.kind).toBe("complete");
    // Cap (30) drops late follow-ups; core safety questions still asked.
    expect(asked.length).toBeLessThanOrEqual(36);
    expect(asked).toContain("medications");
    expect(asked).toContain("allergies");
  });
});
