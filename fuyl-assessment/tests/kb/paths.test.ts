import { describe, expect, it } from "vitest";
import { nextStep, type Answers } from "@/engine";
import { seedKnowledgeBase } from "@/kb";

/**
 * Personalisation guard: different people must get noticeably different
 * question paths, and someone with no concerns must finish quickly.
 */
const kb = seedKnowledgeBase();
const NEUTRAL = ["no", "none", "rarely", "never", "good", "well", "low", "sharp", "quick", "daily", "light", "2-3"];

function walk(script: Record<string, string | number | string[]>): string[] {
  const answers: Answers = {};
  const asked: string[] = [];
  for (let i = 0; i < 60; i++) {
    const s = nextStep(kb, answers);
    if (s.kind !== "question") break;
    const q = s.question;
    asked.push(q.key);
    const v = script[q.key];
    if (q.type === "text") answers[q.key] = { text: String(v ?? "Sam") };
    else if (q.type === "number") answers[q.key] = { number: Number(v ?? 30) };
    else {
      const opts = (q.options ?? []).map((o) => o.value);
      answers[q.key] = { values: v === undefined ? [opts.find((o) => NEUTRAL.includes(o)) ?? opts[0]] : Array.isArray(v) ? v : [String(v)] };
    }
  }
  return asked;
}

const people = {
  stressed: walk({ sex: "female", age: 29, pregnancy: "no", priorities: ["stress", "sleep"], diet: "nonveg", checkin: ["tired", "sleep", "stress", "focus"], energy: "tired", sleep: "falling", stress: "high", focus: "foggy" }),
  runner: walk({ sex: "male", age: 34, priorities: ["fitness"], diet: "vegan", checkin: ["none"], activity: "intense" }),
  healthy: walk({ sex: "male", age: 28, priorities: ["nutrients"], diet: "veg", checkin: ["none"] }),
  gut60: walk({ sex: "female", age: 62, pregnancy: "no", priorities: ["gut", "ageing"], diet: "veg", checkin: ["gut", "joints"] }),
  student: walk({ sex: "male", age: 21, priorities: ["focus", "energy"], diet: "nonveg", checkin: ["focus", "tired"] }),
};

describe("question paths are personalised", () => {
  it("someone with no concerns finishes in about a dozen questions", () => {
    expect(people.healthy.length).toBeLessThanOrEqual(14);
    expect(people.runner.length).toBeLessThanOrEqual(14);
  });

  it("only a small core is asked to everyone", () => {
    const all = Object.values(people);
    const common = all[0].filter((k) => all.every((p) => p.includes(k)));
    expect(common.length).toBeLessThanOrEqual(12);
  });

  it("deep dives appear only for areas the person ticked or prioritised", () => {
    expect(people.healthy).not.toContain("sleep");
    expect(people.healthy).not.toContain("stress");
    expect(people.stressed).toEqual(expect.arrayContaining(["sleep", "sleep_hours", "stress", "stress_impact", "focus"]));
    // Ticking digestive discomfort skips the "how's your digestion?" gate and goes straight to details.
    expect(people.gut60).not.toContain("gut");
    expect(people.gut60).toEqual(expect.arrayContaining(["gut_issues", "gut_freq"]));
  });

  it("safety questions are still asked of everyone", () => {
    for (const p of Object.values(people)) expect(p).toEqual(expect.arrayContaining(["age", "health_gate", "allergies"]));
  });
});
