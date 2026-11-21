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
    const { answers, path } = answerAll({ name: { text: "Riya" }, sex: { values: ["female"] }, age: { number: 30 }, pregnancy: { values: ["no"] } });
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
      priorities: { values: ["energy"] },
      diet: { values: ["nonveg"] },
      fish: { values: ["rarely"] },
    });
    // Switch to vegetarian: the fish answer must go, the dairy question appears.
    const r = applyAnswer(kb, answers, path, "diet", { values: ["veg"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers.fish).toBeUndefined();
    expect(r.path).not.toContain("fish");
    expect(r.state.view).toMatchObject({ kind: "question", question: { key: "dairy" } });
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
