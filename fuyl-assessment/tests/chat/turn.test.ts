import { describe, expect, it, vi } from "vitest";
import { nextStep, type Answers } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import type { AiPort, AiRequest } from "@/chat/ai";
import { message } from "@/chat/script";
import { openingMessages, runTurn, type TurnContext } from "@/chat/turn";
import type { ChatMessage } from "@/chat/types";

const kb = seedKnowledgeBase();

function ctx(over: Partial<TurnContext> = {}): TurnContext {
  const open = openingMessages(kb);
  return { kb, mode: "hybrid", ai: null, answers: {}, path: [], askKey: open.askKey, history: open.add, ...over };
}

/** Feed a reply and carry the state forward. */
async function say(c: TurnContext, text: string) {
  const user = message({ role: "user", text });
  const r = await runTurn({ ...c, history: [...c.history, user] }, { kind: "text", text });
  return { r, next: { ...c, answers: r.answers, path: r.path, askKey: r.askKey, history: [...c.history, user, ...r.add] } as TurnContext };
}

const fakeAi = (fn: (req: AiRequest) => unknown): AiPort => ({ json: vi.fn(async (req: AiRequest) => fn(req)) });
const failingAi = (): AiPort => ({ json: vi.fn(async () => Promise.reject(new Error("429"))) });

describe("chat turns — built-in (no AI)", () => {
  it("opens with a greeting and the first question", () => {
    const o = openingMessages(kb);
    expect(o.add).toHaveLength(2);
    expect(o.askKey).toBe("name");
  });

  it("walks the basics from free text", async () => {
    let c = ctx();
    ({ next: c } = await say(c, "I'm Riya"));
    expect(c.answers.name).toEqual({ text: "Riya" });
    expect(c.history.at(-1)!.text).toContain("Riya");
    ({ next: c } = await say(c, "female"));
    ({ next: c } = await say(c, "29"));
    expect(c.answers.age).toEqual({ number: 29 });
    expect(c.askKey).toBe("pregnancy");
  });

  it("asks again with the options when unclear, without changing answers", async () => {
    let c = ctx({ answers: { name: { text: "Riya" } }, path: ["name"], askKey: "sex" });
    const { r } = await say(c, "blue");
    expect(r.answers).toEqual(c.answers);
    expect(r.add[0].kind).toBe("clarify");
    expect(r.add[0].text).toMatch(/Female/);
    c = { ...c };
  });

  it("explains out-of-range numbers using the engine's limits", async () => {
    const c = ctx({ answers: { name: { text: "A" }, sex: { values: ["male"] } }, path: ["name", "sex"], askKey: "age" });
    const { r } = await say(c, "I'm 140");
    expect(r.answers.age).toBeUndefined();
    expect(r.add[0].text).toMatch(/no more than 99/);
  });

  it("a safety stop comes from the engine (under 19 → stop message, no more questions)", async () => {
    const c = ctx({ answers: { name: { text: "A" }, sex: { values: ["male"] } }, path: ["name", "sex"], askKey: "age" });
    const { r } = await say(c, "17");
    expect(r.add[0].kind).toBe("stop");
    expect(r.askKey).toBeUndefined();
  });

  it("urgent messages get a doctor/helpline reply and change nothing", async () => {
    const c = ctx();
    const { r } = await say(c, "I have chest pain right now");
    expect(r.via).toBe("guard");
    expect(r.add[0].text).toMatch(/112/);
    expect(r.answers).toEqual({});
  });

  it("chips answer the current question directly, stale chips are ignored", async () => {
    const c = ctx({ answers: { name: { text: "A" } }, path: ["name"], askKey: "sex" });
    const ok = await runTurn(c, { kind: "choice", key: "sex", input: { values: ["female"] } });
    expect(ok.answers.sex).toEqual({ values: ["female"] });
    const stale = await runTurn(c, { kind: "choice", key: "diet", input: { values: ["veg"] } });
    expect(stale.answers.diet).toBeUndefined();
  });
});

describe("chat turns — hybrid with AI", () => {
  it("uses the AI's structured answer and its acknowledgement", async () => {
    const ai = fakeAi(() => ({ action: "answer", values: [], number: null, text: "Riya", ack: "Lovely name!", message: "" }));
    const { r } = await say(ctx({ ai }), "you can call me riya");
    expect(r.via).toBe("ai");
    expect(r.answers.name).toEqual({ text: "Riya" });
  });

  it("rejects AI answers that aren't real options (engine validation wins)", async () => {
    const ai = fakeAi(() => ({ action: "answer", values: ["robot"], number: null, text: null, ack: "", message: "" }));
    const c = ctx({ ai, answers: { name: { text: "A" } }, path: ["name"], askKey: "sex" });
    const { r } = await say(c, "robot");
    expect(r.answers.sex).toBeUndefined();
    expect(r.add[0].kind).toBe("clarify");
  });

  it("falls back to built-in understanding when the AI fails", async () => {
    const { r } = await say(ctx({ ai: failingAi() }), "Riya");
    expect(r.aiFailed).toBe(true);
    expect(r.via).toBe("builtin");
    expect(r.answers.name).toEqual({ text: "Riya" });
  });

  it("falls back on malformed AI output", async () => {
    const { r } = await say(ctx({ ai: fakeAi(() => ({ hello: "world" })) }), "Riya");
    expect(r.aiFailed).toBe(true);
    expect(r.answers.name).toEqual({ text: "Riya" });
  });

  it("strips links and markup from AI text", async () => {
    const ai = fakeAi(() => ({ action: "clarify", values: [], number: null, text: null, ack: "", message: "Visit **[this](https://evil.example)** now https://x.y" }));
    const { r } = await say(ctx({ ai }), "???");
    expect(r.add[0].text).not.toMatch(/https?:|\*\*|evil/);
  });
});

describe("chat turns — full AI", () => {
  const basics: Answers = { name: { text: "Riya" }, sex: { values: ["female"] }, age: { number: 30 } };

  it("records several answers at once and follows the model's next question", async () => {
    const ai = fakeAi(() => ({
      answers: [
        { key: "pregnancy", values: ["no"], number: null, text: null },
        { key: "diet", values: ["veg"], number: null, text: null },
      ],
      reply: "Thanks! What are your top priorities right now?",
      ask_key: "priorities",
    }));
    const c = ctx({ mode: "full", ai, answers: basics, path: ["name", "sex", "age"], askKey: "pregnancy" });
    const { r } = await say(c, "not pregnant, and I'm vegetarian");
    expect(r.answers.pregnancy).toEqual({ values: ["no"] });
    expect(r.answers.diet).toEqual({ values: ["veg"] });
    expect(r.askKey).toBe("priorities");
    expect(r.via).toBe("ai");
  });

  it("ignores invented keys and invalid values from the model", async () => {
    const ai = fakeAi(() => ({
      answers: [
        { key: "favourite_colour", values: ["blue"], number: null, text: null },
        { key: "age", values: [], number: 500, text: null },
        { key: "pregnancy", values: ["maybe"], number: null, text: null },
      ],
      reply: "Ok!",
      ask_key: "nonsense",
    }));
    const c = ctx({ mode: "full", ai, answers: basics, path: ["name", "sex", "age"], askKey: "pregnancy" });
    const { r } = await say(c, "blah");
    expect(r.answers).toEqual(basics);
    // The model asked nothing valid, so the engine's next question is asked.
    expect(r.askKey).toBe("pregnancy");
  });

  it("the engine decides safety stops even if the model wants to continue", async () => {
    const ai = fakeAi(() => ({
      answers: [{ key: "pregnancy", values: ["pregnant"], number: null, text: null }],
      reply: "Congratulations! Now, what's your diet like?",
      ask_key: "diet",
    }));
    const c = ctx({ mode: "full", ai, answers: basics, path: ["name", "sex", "age"], askKey: "pregnancy" });
    const { r } = await say(c, "I'm pregnant");
    expect(nextStep(kb, r.answers).kind).toBe("stopped");
    expect(r.add.at(-1)!.kind).toBe("stop");
  });

  it("falls back to built-in for the turn when the AI is down", async () => {
    const c = ctx({ mode: "full", ai: failingAi(), answers: basics, path: ["name", "sex", "age"], askKey: "pregnancy" });
    const { r } = await say(c, "no");
    expect(r.aiFailed).toBe(true);
    expect(r.answers.pregnancy).toEqual({ values: ["no"] });
  });

  it("the prompt sends the model only a small window of needed questions and no email", async () => {
    let seen: AiRequest | undefined;
    const ai = fakeAi((req) => {
      seen = req;
      return { answers: [], reply: "Which best describes you?", ask_key: "sex" };
    });
    const c = ctx({ mode: "full", ai, answers: { name: { text: "Riya" } }, path: ["name"], askKey: "sex" });
    await say(c, "hello");
    const state = JSON.parse(seen!.messages[0].content.split("Current state:\n")[1]);
    expect(state.needed.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(seen)).not.toMatch(/@/);
  });

  it("completes only when the engine says so, with a recap of summary lines", async () => {
    // Answer everything via the built-in path, then check the last message is the recap.
    let c = ctx();
    const replies: Record<string, string> = {
      name: "Riya", sex: "female", age: "30", pregnancy: "no", priorities: "energy", diet: "veg", dairy: "daily",
      fruitveg: "2", activity: "light", sun: "rarely", screen: "10", caffeine: "2", alcohol: "never", smoke: "no",
      energy: "good", sleep: "well", stress: "low", gut: "good", colds: "rarely", focus: "sharp", skin: "all good",
      periods: "none", health_gate: "no", surgery: "no", allergies: "no", fish: "rarely", fried: "rarely",
      ageing_signs: "none", conditions: "none", medications: "none",
    };
    for (let i = 0; i < 40 && c.askKey; i++) {
      const reply = replies[c.askKey] ?? "no";
      ({ next: c } = await say(c, reply));
    }
    expect(nextStep(kb, c.answers).kind).toBe("complete");
    const last = c.history.at(-1) as ChatMessage;
    expect(last.kind).toBe("recap");
    expect(last.lines!.length).toBeGreaterThan(3);
  });
});
