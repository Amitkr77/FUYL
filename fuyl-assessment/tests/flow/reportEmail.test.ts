import { describe, expect, it } from "vitest";
import { buildResult } from "@/engine";
import { seedKnowledgeBase } from "@/kb";
import { buildReportEmail } from "@/lib/reportEmail";

const kb = seedKnowledgeBase();

function sample(name: string, extra: Record<string, unknown> = {}) {
  return buildResult(kb, {
    name: { text: name },
    sex: { values: ["male"] },
    age: { number: 30 },
    priorities: { values: ["energy", "gut"] },
    diet: { values: ["nonveg"] },
    fish: { values: ["often"] },
    energy: { values: ["tired"] },
    ...extra,
  } as never);
}

const input = (result: ReturnType<typeof sample>) => ({
  result,
  resultUrl: "https://assess.example/result/abc",
  productUrl: "https://fuyl.in/products/fuyl-complete?utm_source=x",
  productTitle: "FUYL COMPLETE+",
  priceFrom: 1499,
});

describe("buildReportEmail", () => {
  it("personalises the subject and lists focus areas with ingredients", () => {
    const email = buildReportEmail(input(sample("Riya")));
    expect(email.subject).toBe("Riya, your FUYL wellness report is ready");
    expect(email.html).toContain("Hi Riya");
    expect(email.html).toContain("Energy");
    expect(email.html).toContain("Vitamin B12 (2.2 mcg)");
    expect(email.html).toContain("https://assess.example/result/abc");
    expect(email.html).toContain("₹1,499");
    expect(email.text).toContain("Full report: https://assess.example/result/abc");
  });

  it("escapes anything user-controlled", () => {
    const r = sample("Riya");
    r.name = `<img src=x onerror=alert(1)>`;
    const email = buildReportEmail(input(r));
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("includes safety notes and drops the product button when a stop rule fires", () => {
    const r = sample("Sam");
    const stopped = { ...r, showProduct: false, safety: { level: "stop" as const, notes: [{ key: "x", level: "stop" as const, title: "Speak to your doctor", message: "Not suitable.", ingredients: [] }] } };
    const email = buildReportEmail(input(stopped));
    expect(email.html).toContain("Before you start");
    expect(email.html).not.toContain("View FUYL COMPLETE+ on fuyl.in");
  });
});
