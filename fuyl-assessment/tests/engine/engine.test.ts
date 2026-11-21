import { describe, expect, it } from "vitest";
import {
  buildContext,
  buildResult,
  buildSummary,
  checkKnowledgeBase,
  evaluate,
  nextStep,
  prune,
  render,
  validateAnswer,
  type Answers,
  type KnowledgeBase,
} from "@/engine";
import { fixtureKB } from "./fixture";

const kb = fixtureKB();
const q = (key: string) => kb.questions.find((x) => x.key === key)!;

/** Walk the flow, answering from a script; returns the keys asked in order. */
function walk(k: KnowledgeBase, script: Answers): { asked: string[]; answers: Answers; end: string } {
  const answers: Answers = {};
  const asked: string[] = [];
  for (let i = 0; i < 100; i++) {
    const step = nextStep(k, answers);
    if (step.kind !== "question") return { asked, answers, end: step.kind };
    const key = step.question.key;
    asked.push(key);
    if (!script[key]) throw new Error(`No scripted answer for "${key}"`);
    answers[key] = script[key];
  }
  throw new Error("loop");
}

const base: Answers = {
  name: { text: "riya" },
  sex: { values: ["female"] },
  age: { number: 30 },
  pregnancy: { values: ["no"] },
  priorities: { values: ["energy", "gut"] },
  energy: { values: ["slump"] },
  energy_when: { values: ["morning"] },
  gut: { values: ["bloat"] },
  gut_freq: { values: ["often"] },
  sleep: { values: ["well"] },
  conditions_gate: { values: ["no"] },
  meds: { values: ["none"] },
};

describe("conditions", () => {
  const ctx = buildContext(kb, { sex: { values: ["female"] }, age: { number: 30 }, gut: { values: ["none"] } });
  it("handles answer/in, notIn, number ranges and combinators", () => {
    expect(evaluate({ answer: "sex", in: ["female"] }, ctx)).toBe(true);
    expect(evaluate({ answer: "gut", notIn: ["none"] }, ctx)).toBe(false);
    expect(evaluate({ answer: "energy", notIn: ["good"] }, ctx)).toBe(false); // unanswered ≠ notIn
    expect(evaluate({ number: "age", gte: 19, lte: 50 }, ctx)).toBe(true);
    expect(evaluate({ number: "age", lt: 19 }, ctx)).toBe(false);
    expect(evaluate({ all: [{ answered: "sex" }, { not: { answered: "energy" } }] }, ctx)).toBe(true);
    expect(evaluate({ any: [{ flag: "nope" }, { score: "gut", gte: 1 }] }, ctx)).toBe(false);
    expect(evaluate(undefined, ctx)).toBe(true);
  });
});

describe("validateAnswer", () => {
  it("accepts a valid single choice and rejects unknown values", () => {
    expect(validateAnswer(q("sex"), { values: ["male"] })).toEqual({ ok: true, answer: { values: ["male"] } });
    expect(validateAnswer(q("sex"), { values: ["robot"] }).ok).toBe(false);
    expect(validateAnswer(q("sex"), { values: ["male", "female"] }).ok).toBe(false);
  });
  it("enforces maxSelect, exclusivity and canonical order for multi", () => {
    expect(validateAnswer(q("priorities"), { values: ["gut", "energy"] })).toEqual({ ok: true, answer: { values: ["energy", "gut"] } });
    expect(validateAnswer(q("priorities"), { values: ["gut", "energy", "sleep"] }).ok).toBe(false);
    expect(validateAnswer(q("gut"), { values: ["none", "bloat"] }).ok).toBe(false);
    expect(validateAnswer(q("gut"), { values: [] }).ok).toBe(false);
  });
  it("validates numbers and names", () => {
    expect(validateAnswer(q("age"), { number: "34" })).toEqual({ ok: true, answer: { number: 34 } });
    expect(validateAnswer(q("age"), { number: 34.5 }).ok).toBe(false);
    expect(validateAnswer(q("age"), { number: 101 }).ok).toBe(false);
    expect(validateAnswer(q("name"), { text: "  Riya   Sharma " })).toEqual({ ok: true, answer: { text: "Riya Sharma" } });
    expect(validateAnswer(q("name"), { text: "<script>" }).ok).toBe(false);
    expect(validateAnswer(q("name"), { text: "प्रिया" }).ok).toBe(true);
  });
});

describe("flow", () => {
  it("asks questions in block order and branches on answers", () => {
    const { asked, end } = walk(kb, base);
    expect(end).toBe("complete");
    expect(asked).toEqual([
      "name", "sex", "age", "pregnancy", "priorities",
      "energy", "energy_when", "gut", "gut_freq", "sleep", "conditions_gate",
    ]);
  });

  it("skips female-only and follow-up questions when they don't apply", () => {
    const { asked } = walk(kb, {
      ...base,
      sex: { values: ["male"] },
      energy: { values: ["good"] },
      gut: { values: ["none"] },
      conditions_gate: { values: ["yes"] },
    });
    expect(asked).not.toContain("pregnancy");
    expect(asked).not.toContain("energy_when");
    expect(asked).not.toContain("gut_freq");
    expect(asked).toContain("meds");
  });

  it("stops immediately for under-19s and pregnancy", () => {
    const young = nextStep(kb, { name: { text: "a" }, sex: { values: ["male"] }, age: { number: 17 } });
    expect(young).toMatchObject({ kind: "stopped", rule: { key: "under_19" } });
    const preg = nextStep(kb, { ...base, pregnancy: { values: ["pregnant"] } });
    expect(preg).toMatchObject({ kind: "stopped", rule: { key: "pregnant" } });
  });

  it("personalises prompts with the first name", () => {
    const step = nextStep(kb, { name: { text: "riya sharma" } });
    expect(step.kind === "question" && step.question.prompt).toBe("Which best describes you, Riya?");
  });

  it("drops follow-ups once the question cap is reached but keeps core questions", () => {
    const capped: KnowledgeBase = { ...kb, settings: { ...kb.settings, questionCap: 5 } };
    const { asked } = walk(capped, base);
    expect(asked).not.toContain("energy_when");
    expect(asked).not.toContain("gut_freq");
    expect(asked).toContain("conditions_gate");
  });

  it("prunes answers from branches that closed after an edit", () => {
    const edited = { ...base, sex: { values: ["male"] }, energy: { values: ["good"] } };
    const kept = prune(kb, edited);
    expect(kept.pregnancy).toBeUndefined();
    expect(kept.energy_when).toBeUndefined();
    expect(kept.gut_freq).toBeDefined();
  });

  it("reports progress between 0 and 1 that never decreases along a path", () => {
    const answers: Answers = {};
    let last = -1;
    for (;;) {
      const s = nextStep(kb, answers);
      if (s.kind !== "question") break;
      expect(s.progress).toBeGreaterThanOrEqual(last);
      expect(s.progress).toBeLessThanOrEqual(1);
      last = s.progress;
      answers[s.question.key] = base[s.question.key];
    }
  });
});

describe("summary", () => {
  it("builds plain sentences, skipping null summaries", () => {
    const lines = buildSummary(kb, prune(kb, base)).map((l) => l.text);
    expect(lines).toContain("You're Riya.");
    expect(lines).toContain("You identify as female.");
    expect(lines).toContain("You're 30 years old.");
    expect(lines).toContain("Your energy is dipping in the afternoon.");
    expect(lines).toContain("Digestion: bloating.");
    const na = buildSummary(kb, { ...base, sex: { values: ["na"] } }).map((l) => l.text);
    expect(na.some((l) => l.startsWith("You identify"))).toBe(false);
  });
});

describe("result", () => {
  it("ranks user priorities first, with levels, reasons and de-duplicated ingredients", () => {
    const r = buildResult(kb, { ...base, sleep: { values: ["poor"] } });
    expect(r.kbVersion).toBe(7);
    expect(r.name).toBe("Riya");
    // Both priorities first, ordered by match %; then the best non-priority area.
    expect(r.areas.map((a) => a.key)).toEqual(["energy", "gut", "sleep"]);
    expect(r.areas[0].isPriority).toBe(true);
    expect(r.areas[2].isPriority).toBe(false);

    const energy = r.areas.find((a) => a.key === "energy")!;
    expect(energy.reasons[0]).toBe("You hit an afternoon slump");
    expect(energy.ingredients.map((i) => i.key)).toEqual(["b12", "iron", "ash"]);
    expect(energy.ingredients[0]).toMatchObject({ name: "Vitamin B12", dose: "2.2 mcg", why: "B12 supports energy" });
    expect(energy.tips).toHaveLength(2);

    // Ashwagandha is listed under Energy first; Sleep shows Magnesium, then
    // tops up with Ashwagandha marked as shared so the card isn't thin.
    const sleep = r.areas.find((a) => a.key === "sleep")!;
    expect(sleep.ingredients.map((i) => [i.key, i.sharedWith])).toEqual([
      ["mag", undefined],
      ["ash", "Energy"],
    ]);

    for (const a of r.areas) {
      expect(a.match).toBeGreaterThan(0);
      expect(a.match).toBeLessThanOrEqual(100);
      expect(["high", "moderate", "mild"]).toContain(a.level);
    }
    expect(r.showProduct).toBe(true);
    expect(r.safety.level).toBe("none");
    expect(r.coverage.areaCount).toBe(3);
    expect(r.coverage.ingredientCount).toBe(7);
  });

  it("is deterministic", () => {
    expect(buildResult(kb, base)).toEqual(buildResult(kb, base));
  });

  it("adds consult notes naming the affected ingredients and keeps the product", () => {
    const r = buildResult(kb, { ...base, conditions_gate: { values: ["yes"] }, meds: { values: ["thyroid"] } });
    expect(r.safety.level).toBe("consult");
    expect(r.safety.notes[0]).toMatchObject({ key: "thyroid", ingredients: ["KSM-66® Ashwagandha"] });
    expect(r.showProduct).toBe(true);
  });

  it("hides the product when a stop rule fires", () => {
    const r = buildResult(kb, { ...base, pregnancy: { values: ["pregnant"] } });
    expect(r.safety.level).toBe("stop");
    expect(r.showProduct).toBe(false);
  });

  it("ignores answers from closed branches", () => {
    const r = buildResult(kb, { ...base, sex: { values: ["male"] }, pregnancy: { values: ["pregnant"] } });
    expect(r.safety.level).toBe("none");
  });
});

describe("text", () => {
  it("collapses {name} cleanly when unknown", () => {
    expect(render("Which best describes you, {name}?", undefined)).toBe("Which best describes you?");
    expect(render("{name}, how old are you?", undefined)).toBe("How old are you?");
  });
});

describe("checkKnowledgeBase", () => {
  it("passes the fixture with no errors", () => {
    const errors = checkKnowledgeBase(kb).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("detects broken references, unknown ingredients and unreachable questions", () => {
    const broken = fixtureKB();
    broken.questions.push({
      key: "orphan", block: "feel", order: 9, type: "single", tier: "followup", prompt: "x",
      showIf: { answer: "does_not_exist", in: ["a"] },
      options: [{ value: "a", label: "A" }, { value: "b", label: "B" }],
    });
    broken.areas[0].ingredients.push({ key: "ghost", weight: 1, why: "?" });
    broken.safetyRules.push({ key: "r", level: "info", when: { flag: "never_raised" }, title: "t", message: "m", ingredientKeys: [] });
    const codes = checkKnowledgeBase(broken).map((i) => i.code);
    expect(codes).toContain("unknown_reference");
    expect(codes).toContain("unknown_ingredient");
    expect(codes).toContain("unreachable_question");
    expect(codes).toContain("unreachable_rule");
  });

  it("flags conditions that depend on later questions", () => {
    const k = fixtureKB();
    k.questions.find((x) => x.key === "sex")!.showIf = { answered: "sleep" };
    expect(checkKnowledgeBase(k).map((i) => i.code)).toContain("forward_reference");
  });
});
