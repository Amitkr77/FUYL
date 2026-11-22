import { describe, expect, it } from "vitest";
import { seedKnowledgeBase } from "@/kb";
import { numbersIn, understand } from "@/chat/understand";

const kb = seedKnowledgeBase();
const q = (key: string) => kb.questions.find((x) => x.key === key)!;
const vals = (key: string, text: string) => {
  const r = understand(q(key), text);
  return r.ok ? r.input.values ?? r.input.number ?? r.input.text : r.reason;
};

describe("numbersIn", () => {
  it("reads digits and English number words", () => {
    expect(numbersIn("I'm 27")).toEqual([27]);
    expect(numbersIn("twenty seven years")).toEqual([27]);
    expect(numbersIn("about 6.5 hours")).toEqual([6.5]);
    expect(numbersIn("5-6 hours")).toEqual([5, 6]);
  });
});

describe("understand (built-in)", () => {
  it("names: pulls the first name out of a sentence and capitalises it", () => {
    expect(vals("name", "riya")).toBe("Riya");
    expect(vals("name", "Hi, my name is priya sharma!")).toBe("Priya Sharma");
    expect(vals("name", "I'm Arjun")).toBe("Arjun");
  });

  it("numbers: age in words or digits", () => {
    expect(vals("age", "I'm 34 years old")).toBe(34);
    expect(vals("age", "thirty two")).toBe(32);
    expect(vals("age", "not telling")).toBe("unclear");
  });

  it("single choice: labels, synonyms and option numbers", () => {
    expect(vals("sex", "female")).toEqual(["female"]);
    expect(vals("sex", "I'm a woman")).toEqual(["female"]);
    expect(vals("sex", "male")).toEqual(["male"]);
    expect(vals("diet", "I eat chicken and fish")).toEqual(["nonveg"]);
    expect(vals("diet", "pure veg")).toEqual(["veg"]);
    expect(vals("stress", "very stressed honestly")).toEqual(["high"]);
    expect(vals("diet", "3")).toEqual(["vegan"]);
  });

  it("numeric bands: maps amounts to the right range", () => {
    expect(vals("sleep_hours", "about 6 hours")).toEqual(["5-6"]);
    expect(vals("sleep_hours", "less than 5")).toEqual(["<5"]);
    expect(vals("sleep_hours", "9")).toEqual(["8+"]);
    expect(vals("screen", "10 hours a day")).toEqual(["8+"]);
    expect(vals("caffeine", "2 cups")).toEqual(["2-3"]);
  });

  it("yes/no: negations win, and ambiguity asks again", () => {
    expect(vals("smoke", "No, I don't smoke")).toEqual(["no"]);
    expect(vals("smoke", "yes")).toEqual(["yes"]);
    expect(vals("smoke", "haan")).toEqual(["yes"]);
    expect(vals("smoke", "hmm")).toBe("unclear");
    expect(vals("health_gate", "I'd rather not say")).toEqual(["pns"]);
  });

  it("pregnancy: recognises each state and 'no'", () => {
    expect(vals("pregnancy", "I'm expecting")).toEqual(["pregnant"]);
    expect(vals("pregnancy", "nursing my baby")).toEqual(["breastfeeding"]);
    expect(vals("pregnancy", "trying for a baby")).toEqual(["ttc"]);
    expect(vals("pregnancy", "none of these")).toEqual(["no"]);
  });

  it("multi choice: several picks, 'none', and the selection limit", () => {
    expect(vals("priorities", "energy and sleep")).toEqual(["energy", "sleep"]);
    expect(vals("priorities", "energy, sleep, gut, skin")).toBe("too-many");
    expect(vals("energy_signs", "none")).toEqual(["none"]);
    expect(vals("gut_issues", "bloating and acidity after meals")).toEqual(expect.arrayContaining(["bloating", "acidity"]));
  });

  it("safety: unrecognised conditions/medicines count as 'Something else' so the consult note stays", () => {
    expect(vals("conditions", "I have PCOS and asthma")).toEqual(["other"]);
    expect(vals("conditions", "thyroid")).toEqual(["thyroid"]);
    expect(vals("conditions", "no nothing")).toEqual(["none"]);
    expect(vals("medications", "I take metformin")).toEqual(["diabetes"]);
    expect(vals("medications", "some ayurvedic tablets")).toEqual(["other"]);
    expect(vals("medications", "nope")).toEqual(["none"]);
  });
});
