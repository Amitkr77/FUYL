import { describe, expect, it, vi } from "vitest";
import { nextStep, type Answers } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import type { AiPort, AiRequest } from "@/chat/ai";
import { assistTurn, type AssistContext } from "@/chat/turn";

const kb = seedKnowledgeBase();

const ctx = (over: Partial<AssistContext> = {}): AssistContext => ({ kb, mode: "hybrid", ai: null, answers: {}, path: [], ...over });
const fakeAi = (fn: (req: AiRequest) => unknown): AiPort => ({ json: vi.fn(async (req: AiRequest) => fn(req)) });
const failingAi = (): AiPort => ({ json: vi.fn(async () => Promise.reject(new Error("429"))) });
const ai = (o: Record<string, unknown>) => fakeAi(() => ({ action: "answer", values: [], number: null, text: null, ack: "", message: "", others: [], ...o }));

const basics: Answers = { name: { text: "Riya" }, sex: { values: ["female"] }, age: { number: 30 } };
const basicsPath = ["name", "sex", "age"];

describe("assisted answers — built-in understanding (no AI)", () => {
  it("turns a typed name into the answer and moves to the next question card", async () => {
    const r = await assistTurn(ctx(), "name", "hi, my name is riya");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers.name).toEqual({ text: "Riya" });
    expect(r.understood).toEqual(["Riya"]);
    expect(r.state.view.kind === "question" && r.state.view.question.key).toBe("sex");
  });

  it("maps everyday words to options", async () => {
    const r = await assistTurn(ctx({ answers: { name: { text: "A" } }, path: ["name"] }), "sex", "I'm a woman");
    expect(r.ok && r.answers.sex).toEqual({ values: ["female"] });
  });

  it("asks a gentle follow-up when unclear, without changing answers", async () => {
    const r = await assistTurn(ctx({ answers: { name: { text: "A" } }, path: ["name"] }), "sex", "blue");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.clarify).toMatch(/Female/);
  });

  it("explains out-of-range numbers with the engine's limits", async () => {
    const r = await assistTurn(ctx({ answers: { name: { text: "A" }, sex: { values: ["male"] } }, path: ["name", "sex"] }), "age", "I'm 140");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.clarify).toMatch(/no more than 99/);
  });

  it("the engine decides safety stops (under 19 → stop view)", async () => {
    const r = await assistTurn(ctx({ answers: { name: { text: "A" }, sex: { values: ["male"] } }, path: ["name", "sex"] }), "age", "17");
    expect(r.ok && r.state.view.kind).toBe("stopped");
  });

  it("urgent messages get a doctor/helpline reply and change nothing", async () => {
    const r = await assistTurn(ctx(), "name", "I have chest pain right now");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.via).toBe("guard");
      expect(r.clarify).toMatch(/112/);
    }
  });

  it("rejects answers for questions that aren't on screen or answered", async () => {
    const r = await assistTurn(ctx(), "conditions", "none");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it("can change an earlier answer in own words", async () => {
    const r = await assistTurn(ctx({ answers: basics, path: basicsPath }), "age", "actually I'm 35");
    expect(r.ok && r.answers.age).toEqual({ number: 35 });
  });
});

describe("assisted answers — hybrid with AI", () => {
  it("uses the AI's structured answer and acknowledgement", async () => {
    const r = await assistTurn(ctx({ ai: ai({ text: "Riya", ack: "Lovely name!" }) }), "name", "you can call me riya");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.via).toBe("ai");
      expect(r.ack).toBe("Lovely name!");
      expect(r.answers.name).toEqual({ text: "Riya" });
    }
  });

  it("ignores 'others' in hybrid mode — one question at a time", async () => {
    const r = await assistTurn(
      ctx({ ai: ai({ values: ["no"], others: [{ key: "diet", values: ["veg"], number: null, text: null }] }), answers: basics, path: basicsPath }),
      "pregnancy",
      "not pregnant, vegetarian",
    );
    expect(r.ok && r.answers.diet).toBeUndefined();
  });

  it("rejects AI answers that aren't real options (engine validation wins)", async () => {
    const r = await assistTurn(ctx({ ai: ai({ values: ["robot"] }), answers: { name: { text: "A" } }, path: ["name"] }), "sex", "robot");
    expect(r.ok).toBe(false);
  });

  it("falls back to built-in understanding when the AI fails or returns junk", async () => {
    const down = await assistTurn(ctx({ ai: failingAi() }), "name", "Riya");
    expect(down.ok && down.aiFailed && down.via).toBe("builtin");
    const junk = await assistTurn(ctx({ ai: fakeAi(() => ({ hello: "world" })) }), "name", "Riya");
    expect(junk.ok && junk.answers.name).toEqual({ text: "Riya" });
  });

  it("strips links and markup from AI text", async () => {
    const r = await assistTurn(
      ctx({ ai: fakeAi(() => ({ action: "clarify", values: [], number: null, text: null, ack: "", message: "Visit **[this](https://evil.example)** now https://x.y", others: [] })) }),
      "name",
      "???",
    );
    expect(!r.ok && r.clarify).not.toMatch(/https?:|\*\*|evil/);
  });
});

describe("assisted answers — full AI", () => {
  it("one reply can answer several questions; those are skipped", async () => {
    const r = await assistTurn(
      ctx({
        mode: "full",
        ai: ai({ values: ["no"], ack: "Thanks!", others: [{ key: "diet", values: ["veg"], number: null, text: null }] }),
        answers: basics,
        path: basicsPath,
      }),
      "pregnancy",
      "not pregnant, and I'm vegetarian",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers.pregnancy).toEqual({ values: ["no"] });
    expect(r.answers.diet).toEqual({ values: ["veg"] });
    expect(r.understood).toEqual(["None of these", "Diet: Vegetarian"]);
    expect(r.state.view.kind === "question" && r.state.view.question.key).toBe("priorities");
  });

  it("ignores invented keys, already-answered questions and invalid values", async () => {
    const r = await assistTurn(
      ctx({
        mode: "full",
        ai: ai({
          values: ["no"],
          others: [
            { key: "favourite_colour", values: ["blue"], number: null, text: null },
            { key: "age", values: [], number: 50, text: null },
            { key: "diet", values: ["carnivore"], number: null, text: null },
          ],
        }),
        answers: basics,
        path: basicsPath,
      }),
      "pregnancy",
      "no",
    );
    expect(r.ok && r.answers).toEqual({ ...basics, pregnancy: { values: ["no"] } });
  });

  it("the engine decides stops, whatever the model says", async () => {
    const r = await assistTurn(ctx({ mode: "full", ai: ai({ values: ["pregnant"], ack: "Congratulations!" }), answers: basics, path: basicsPath }), "pregnancy", "I'm pregnant");
    expect(r.ok && nextStep(kb, r.answers).kind).toBe("stopped");
  });

  it("sends the model only a small window of upcoming questions and never the email", async () => {
    let seen: AiRequest | undefined;
    await assistTurn(
      ctx({
        mode: "full",
        ai: fakeAi((req) => {
          seen = req;
          return { action: "answer", values: ["female"], number: null, text: null, ack: "", message: "", others: [] };
        }),
        answers: { name: { text: "Riya" } },
        path: ["name"],
      }),
      "sex",
      "female",
    );
    const body = JSON.parse(seen!.messages[1].content);
    expect(body.upcoming.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(seen)).not.toMatch(/@/);
  });
});
