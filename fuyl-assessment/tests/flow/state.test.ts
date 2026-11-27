import { describe, expect, it } from "vitest";
import type { Answers } from "@/engine";
import { applyAnswer, frontierView, questionView } from "@/flow/state";
import { seedKnowledgeBase } from "@/kb";

const kb = seedKnowledgeBase();

function answerAll(script: Record<string, unknown>) {
  let answers: Answers = {};
  let path: string[] = [];
  for (const [key, input] of Object.entries(script)) {
    const r = applyAnswer(kb, answers, path, key, input as never);
    if (!r.ok) throw new Error(`${key}: ${r.error}`);
    answers = r.answers;
    path = r.path;
  }
  return { answers, path };
}

describe("frontierView", () => {
  it("starts at the name question with no back target", () => {
    const v = frontierView(kb, {}, []);
    expect(v).toMatchObject({ kind: "question", question: { key: "name" } });
    expect(v.kind === "question" && v.backKey).toBeUndefined();
  });

  it("never leaks scoring internals to the browser", () => {
    const { answers, path } = answerAll({ name: { text: "Riya" }, sex: { values: ["female"] }, age: { number: 30 }, country: { values: ["in"] }, state: { values: ["delhi"] }, pregnancy: { values: ["no"] } });
    const v = frontierView(kb, answers, path);
    expect(v.kind).toBe("question");
    const json = JSON.stringify(v);
    for (const leak of ['"effects"', '"flags"', '"reason"', '"showIf"', '"summary"', '"tier"', '"bands"']) expect(json).not.toContain(leak);
    expect(v.kind === "question" && v.question.prompt).toBe("Riya, what are your top priorities right now?");
  });
});

describe("applyAnswer", () => {
  it("rejects answers to questions that aren't available", () => {
    const r = applyAnswer(kb, {}, [], "diet", { values: ["veg"] });
    expect(r).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects invalid answers with a readable message", () => {
    const r = applyAnswer(kb, {}, [], "name", { text: "" });
    expect(r).toMatchObject({ ok: false, status: 422, error: "Please fill this in." });
  });

  it("moves through the flow and records the path", () => {
    const { path } = answerAll({ name: { text: "Riya" }, sex: { values: ["male"] }, age: { number: 30 } });
    expect(path).toEqual(["name", "sex", "age"]);
  });

  it("goes to the stop screen for under-19s, with Back to fix a typo", () => {
    const r = applyAnswer(kb, ...Object.values(answerAll({ name: { text: "A" }, sex: { values: ["male"] } })) as [Answers, string[]], "age", { number: 17 });
    expect(r.ok && r.state.view).toMatchObject({ kind: "stopped", backKey: "age" });
  });

  it("editing an earlier answer moves forward one step, not to the end", () => {
    const { answers, path } = answerAll({
      name: { text: "Riya" },
      sex: { values: ["male"] },
      age: { number: 30 },
      country: { values: ["in"] },
      state: { values: ["delhi"] },
      priorities: { values: ["energy"] },
      diet: { values: ["nonveg"] },
    });
    const r = applyAnswer(kb, answers, path, "sex", { values: ["male"] });
    expect(r.ok && r.state.view).toMatchObject({ kind: "question", question: { key: "age" }, answer: { number: 30 } });
  });

  it("editing that opens a new branch drops stale answers and asks the new question next", () => {
    const { answers, path } = answerAll({
      name: { text: "Riya" },
      sex: { values: ["male"] },
      age: { number: 30 },
      country: { values: ["in"] },
      state: { values: ["delhi"] },
      priorities: { values: ["energy"] },
      diet: { values: ["veg"] },
      checkin: { values: ["none"] },
      activity: { values: ["light"] },
      sun: { values: ["some"] },
      screen: { values: ["<4"] },
      caffeine: { values: ["0-1"] },
      alcohol: { values: ["never"] },
      work: { values: ["desk"] },
      diet_week: { grid: { dairy: "d1", pulses: "d1", greens: "w3", veg: "d1", fruits: "d1", nuts: "w1", millets: "w1" } },
    });
    // Switch to non-veg: the grid gains eggs and meat rows, so its old (incomplete) answer is dropped and it's asked again.
    const r = applyAnswer(kb, answers, path, "diet", { values: ["nonveg"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers.diet_week).toBeUndefined();
    expect(r.path).not.toContain("diet_week");
  });
});

describe("questionView", () => {
  it("shows an answered question pre-filled with the right back target", () => {
    const { answers, path } = answerAll({ name: { text: "Riya" }, sex: { values: ["female"] }, age: { number: 30 } });
    const v = questionView(kb, answers, path, "sex");
    expect(v).toMatchObject({ kind: "question", question: { key: "sex" }, answer: { values: ["female"] }, backKey: "name" });
  });

  it("refuses questions that are neither answered nor next", () => {
    expect(questionView(kb, {}, [], "medications")).toBeNull();
  });
});

describe("hardening", () => {
  it("rejects built-in property names as question keys instead of crashing", () => {
    for (const key of ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"]) {
      expect(applyAnswer(kb, {}, [], key, { values: ["x"] })).toMatchObject({ ok: false, status: 409 });
      expect(questionView(kb, {}, [], key)).toBeNull();
    }
  });
});
