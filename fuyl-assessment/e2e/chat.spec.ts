import { expect, test, type Page } from "@playwright/test";
import { E2E } from "./constants";
import { browserFetch, readMail, runAssessment, trackView } from "./helpers";

/**
 * Assisted assessment: the same one-question-per-screen cards as the standard
 * assessment, plus answering in your own words. The e2e environment points the
 * app at a fake Groq API, so the AI path runs without network or cost.
 */

const aiCalls = async (page: Page) => ((await (await page.request.get(`http://127.0.0.1:${E2E.storePort}/__ai`)).json()) as { calls: number }).calls;

async function startAssisted(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Assisted assessment" }).click();
  await page.waitForURL("**/chat");
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await page.waitForURL("**/q**");
  await expect(page.getByRole("heading", { name: "Let's get started. What should we call you?" })).toBeVisible();
}

/** Type into the card's main input (name/age) and continue — once that card is on screen. */
async function typeAnswer(page: Page, text: string, heading: string | RegExp) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).waitFor();
  await page.locator("main form input").first().fill(text);
  await page.getByRole("button", { name: "Continue" }).click();
}

const NAME_Q = "Let's get started. What should we call you?";
const AGE_Q = "How old are you?";

/** Answer a choice question in own words. */
async function ownWords(page: Page, text: string) {
  await page.getByLabel("Answer in your own words").fill(text);
  await page.getByRole("button", { name: "Send answer" }).click();
}

test("the welcome screen offers both assessments; assisted asks for the email first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start the assessment" })).toBeVisible();
  await page.getByRole("button", { name: "Assisted assessment" }).click();
  await page.waitForURL("**/chat");
  await expect(page.getByRole("heading", { name: "Assisted assessment" })).toBeVisible();

  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await page.getByLabel("Your email").fill("riya@gmial.com");
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Please tick the box to continue.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Did you mean")).toBeVisible();
  await page.getByRole("button", { name: "riya@gmail.com" }).click();
  // Same question card as the standard assessment.
  await page.waitForURL("**/q**");
  await expect(page.getByRole("heading", { name: "Let's get started. What should we call you?" })).toBeVisible();
});

test("own words + taps, understood by AI, through to the report and email", async ({ page }) => {
  test.setTimeout(180_000);
  const email = "assisted.riya@example.com";
  const tracker = trackView(page);
  const before = await aiCalls(page);
  await startAssisted(page, email);

  await typeAnswer(page, "hi, my name is riya", NAME_Q);
  await expect(page.getByRole("heading", { name: "Nice to meet you, Riya. Which best describes you?" })).toBeVisible();
  await expect(page.getByText("Noted: Riya")).toBeVisible();

  // Options are still there to tap…
  await page.getByRole("radio", { name: "Female", exact: true }).click();
  // …and numbers can be typed in words.
  await typeAnswer(page, "I'm thirty one", AGE_Q);
  await expect(page.getByText("Noted: 31")).toBeVisible();
  await expect(page.getByText("Lovely, thanks for sharing.")).toBeVisible();

  await ownWords(page, "none of these");
  await expect(page.getByText(/top priorities/)).toBeVisible();
  // No selection limit: pick five.
  await ownWords(page, "energy, sleep, gut, stress and immunity");
  await expect(page.getByText("Noted: Energy, Gut health, Immunity, Stress, Sleep")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How do you usually eat?" })).toBeVisible();
  await expect.poll(() => { const v = tracker.get(); return v?.kind === "question" ? v.question.key : null; }).toBe("diet");
  expect(await aiCalls(page)).toBeGreaterThan(before);

  await runAssessment(page, tracker, { diet: "Vegetarian" });
  await expect(page).toHaveURL(/\/summary/);
  // Email was given up front: no form, just the button.
  await expect(page.getByText(/send a copy to as\*\*\*@example\.com/)).toBeVisible();
  await page.getByRole("button", { name: "See my report" }).click();
  await page.waitForURL("**/result/**", { timeout: 30_000 });

  // Report: summary of findings first, every priority shown, India vs global table.
  await expect(page.getByText("Summary of your findings")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Riya, your top focus areas are/ })).toBeVisible();
  for (const area of ["Energy", "Sleep", "Gut Health", "Stress", "Immunity"]) {
    await expect(page.getByRole("heading", { name: area, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "One serve vs what you need a day" })).toBeVisible();
  await expect(page.getByText("Daily needs shown for adult women.")).toBeVisible();

  await expect.poll(async () => (await readMail(page, email)).length, { timeout: 15_000 }).toBeGreaterThan(0);
  const mail = (await readMail(page, email))[0].raw;
  expect(mail).toMatch(/SUMMARY OF YOUR FINDINGS|Summary of your findings/);
});

test("an unclear typed answer gets a gentle follow-up and the question stays", async ({ page }) => {
  await startAssisted(page, "assisted.unclear@example.com");
  await typeAnswer(page, "Meera", NAME_Q);
  await ownWords(page, "blue");
  await expect(page.getByText("Hmm, could you say that another way?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nice to meet you, Meera. Which best describes you?" })).toBeVisible();
});

test("urgent symptoms get a doctor/helpline reply and the question waits", async ({ page }) => {
  await startAssisted(page, "assisted.urgent@example.com");
  await typeAnswer(page, "I have chest pain right now", NAME_Q);
  await expect(page.getByText(/call 112/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's get started. What should we call you?" })).toBeVisible();
});

test("if the AI is down, typed answers are still understood (built-in fallback)", async ({ page }) => {
  await startAssisted(page, "assisted.fallback@example.com");
  await typeAnswer(page, "Kabir", NAME_Q);
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await typeAnswer(page, "__ai_down 34", AGE_Q);
  await expect(page.getByText(/top priorities right now/)).toBeVisible();
  await expect(page.getByText("Noted: 34")).toBeVisible();
});

test("under 19 stops, with the usual way back to correct the age", async ({ page }) => {
  await startAssisted(page, "assisted.teen@example.com");
  await typeAnswer(page, "Ananya", NAME_Q);
  await page.getByRole("radio", { name: "Female", exact: true }).click();
  await typeAnswer(page, "seventeen", AGE_Q);
  await expect(page.getByText("Made a mistake? Use the back arrow above to change your answer.")).toBeVisible();
});

test("the assist API rejects junk, other questions, and standard sessions", async ({ page }) => {
  await startAssisted(page, "assisted.api@example.com");
  const tooLong = await browserFetch(page, "/api/assist", { method: "POST", body: { key: "name", text: "x".repeat(600) } });
  expect(tooLong.status).toBe(400);
  const wrongKey = await browserFetch(page, "/api/assist", { method: "POST", body: { key: "conditions", text: "none" } });
  expect(wrongKey.status).toBe(409);
  const finishEarly = await browserFetch(page, "/api/chat/finish", { method: "POST" });
  expect(finishEarly.status).toBe(409);

  // A standard session can't use typed answers.
  await page.goto("/");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Start the assessment" }).click();
  await page.waitForURL("**/q");
  const std = await browserFetch(page, "/api/assist", { method: "POST", body: { key: "name", text: "Riya" } });
  expect(std.status).toBe(403);
});
