import { expect, test } from "@playwright/test";
import { readMail, runAssessment, startAssessment, trackView, unlock } from "./helpers";

/**
 * Real people, start to finish, through the UI. Each checks the adaptive path
 * (what was and wasn't asked) and the result that comes out.
 */

test("stressed desk worker on anxiety medicine → stress & sleep lead, consult note, product link works", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page, "?utm_source=e2e&utm_campaign=personas");
  const { asked, end } = await runAssessment(page, tracker, {
    name: "Riya",
    sex: "Female",
    age: "31",
    pregnancy: "None of these",
    priorities: ["Stress", "Sleep"],
    diet: "Vegetarian",
    dairy: "A few times a week",
    activity: "Mostly sitting",
    screen: "More than 8 hours",
    caffeine: "4 or more",
    stress: "High — I feel stretched thin",
    stress_impact: ["Sleep", "Focus"],
    sleep: "I have trouble falling asleep",
    sleep_hours: "5–6 hours",
    sleep_habits: ["Phone or laptop in bed", "A racing mind"],
    health_gate: "Yes",
    conditions: ["None of these"],
    medications: ["Sleep, anxiety or antidepressant medicine"],
  });
  expect(end).toBe("summary");
  expect(asked).toEqual(expect.arrayContaining(["pregnancy", "dairy", "stress_impact", "periods", "medications"]));
  expect(asked).not.toContain("fish");

  await expect(page.getByRole("heading", { name: /Here’s what you told us, Riya/ })).toBeVisible();
  await unlock(page, "riya.e2e@example.com");

  await expect(page.getByRole("heading", { name: "Made for Riya" })).toBeVisible();

  // The report email went out over SMTP (captured by the test mail server).
  await expect.poll(async () => (await readMail(page, "riya.e2e@example.com")).some((m) => /Subject: Riya, your FUYL wellness report is ready/.test(m.raw))).toBe(true);
  await expect(page.getByText("Before you start")).toBeVisible();
  await expect(page.getByText("Sleep, anxiety or antidepressant medicine", { exact: true })).toBeVisible();
  const areas = await page.locator("article h3").allInnerTexts();
  expect(areas.slice(0, 2).sort()).toEqual(["Sleep", "Stress"]);
  await expect(page.getByText("You chose this as a top priority").first()).toBeVisible();

  const cta = page.getByRole("link", { name: /View COMPLETE\+ on fuyl\.in/ });
  const href = await cta.getAttribute("href");
  expect(href).toMatch(/^\/go\/[A-Za-z0-9_-]+$/);
  const go = await page.request.get(href!, { maxRedirects: 0 });
  expect(go.status()).toBe(302);
  const location = new URL(go.headers().location);
  expect(location.pathname).toBe("/products/fuyl-complete");
  expect(location.searchParams.get("utm_source")).toBe("fuyl-assessment");
});

test("vegan runner → fitness first, B12 surfaced; no female-only or dairy questions", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  const { asked } = await runAssessment(page, tracker, {
    name: "Arjun",
    sex: "Male",
    age: "27",
    priorities: ["Fitness & recovery"],
    diet: "Vegan",
    activity: "Intense training",
    training: ["Running / cycling / cardio"],
    sun: "Hardly any",
    energy: "I hit a slump some days",
    energy_when: "Mid-afternoon",
  });
  for (const k of ["pregnancy", "periods", "dairy", "fish"]) expect(asked).not.toContain(k);
  expect(asked).toContain("training");

  await unlock(page, "arjun.e2e@example.com");
  const areas = await page.locator("article h3").allInnerTexts();
  expect(areas[0]).toBe("Fitness & Recovery");
  await expect(page.getByText("Vitamin B12").first()).toBeVisible();
  await expect(page.getByText("Before you start")).toHaveCount(0);
});

test("person with no issues → short path, clean result", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  const { asked, end } = await runAssessment(page, tracker, { sex: "Male", priorities: ["Energy"] });
  expect(end).toBe("summary");
  expect(asked.length).toBeLessThanOrEqual(22);
  await unlock(page, "sam.e2e@example.com");
  await expect(page.locator("article h3").first()).toHaveText("Energy");
  await expect(page.getByText("Before you start")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /View COMPLETE\+ on fuyl\.in/ })).toBeVisible();
});

test("thyroid medicine → consult note naming the right ingredients", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  await runAssessment(page, tracker, { sex: "Male", health_gate: "Yes", conditions: ["Thyroid condition"], medications: ["Thyroid medicine"] });
  await unlock(page, "thyroid.e2e@example.com");
  await expect(page.getByText("Thyroid condition or medicine", { exact: true })).toBeVisible();
  await expect(page.getByText(/Relevant ingredients: KSM-66® Ashwagandha, Iodine, Selenium/)).toBeVisible();
  await expect(page.getByText(/Please check with your doctor before starting — see the note above/)).toBeVisible();
});

test("over-55 → healthy-ageing deep dive and result", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  const { asked } = await runAssessment(page, tracker, { sex: "Male", age: "58", ageing_signs: ["Stiff joints", "Concern about bone health"] });
  expect(asked).toContain("ageing_signs");
  await unlock(page, "ageing.e2e@example.com");
  expect(await page.locator("article h3").allInnerTexts()).toContain("Healthy Ageing");
});

test("18-year-old → stop screen; fixing the age with Back continues", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  const first = await runAssessment(page, tracker, { sex: "Male", age: "18" });
  expect(first.end).toBe("stopped");
  await expect(page.getByRole("heading", { name: "COMPLETE+ is made for adults" })).toBeVisible();

  tracker.reset();
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.locator("main form input")).toHaveValue("18");
  const second = await runAssessment(page, tracker, { age: "22", sex: "Male" });
  expect(second.end).toBe("summary");
});

test("pregnancy → stop screen, no product", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  const { end } = await runAssessment(page, tracker, { sex: "Female", pregnancy: "I'm pregnant" });
  expect(end).toBe("stopped");
  await expect(page.getByText(/aren’t recommended during pregnancy|aren't recommended during pregnancy/)).toBeVisible();
  await expect(page.getByRole("link", { name: /View COMPLETE\+/ })).toHaveCount(0);
});

test("nobody can flood a stranger's inbox: at most 3 report emails per address per day", async ({ browser }) => {
  const victim = "flood.e2e@example.com";
  for (let i = 0; i < 4; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const tracker = trackView(page);
    await startAssessment(page);
    await runAssessment(page, tracker, { sex: "Male" });
    await unlock(page, victim);
    if (i === 3) await expect(page.getByText(/couldn’t email you a copy this time/)).toBeVisible();
    await ctx.close();
  }
  const ctx = await browser.newContext();
  const mails = (await readMail(await ctx.newPage(), victim)).filter((m) => /wellness report is ready/.test(m.raw));
  expect(mails).toHaveLength(3);
  await ctx.close();
});
