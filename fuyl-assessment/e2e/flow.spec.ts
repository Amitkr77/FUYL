import { expect, test } from "@playwright/test";
import { browserFetch, runAssessment, startAssessment, trackView, unlock } from "./helpers";

/** Flow behaviour: consent, resume, edit-from-summary, email gate, links. */

test("consent is required before starting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start the assessment" }).click();
  await expect(page.getByText("Please tick the box to continue.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("a refresh mid-way resumes at the same question", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  await page.locator("main form input").fill("Meera");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Nice to meet you, Meera. Which best describes you?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Nice to meet you, Meera. Which best describes you?" })).toBeVisible();
  expect(tracker.get()?.kind).toBe("question");
});

test("Back re-shows the previous answer; option tiles are keyboard accessible", async ({ page }) => {
  await startAssessment(page);
  await page.locator("main form input").fill("Kabir");
  await page.getByRole("button", { name: "Continue" }).click();
  const male = page.getByRole("radio", { name: "Male", exact: true });
  await male.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "How old are you?" })).toBeVisible();
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.getByRole("radio", { name: "Male", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("editing an answer from the summary opens the new branch and updates the summary", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  await runAssessment(page, tracker, { sex: "Male", diet: "Vegetarian", dairy: "Every day" });
  await expect(page.getByText("You follow a vegetarian diet.")).toBeVisible();

  tracker.reset();
  await page.getByRole("link", { name: /You follow a vegetarian diet\./ }).click();
  await page.waitForURL(/\/q\?edit=diet/);
  await page.getByRole("radio", { name: "Non-vegetarian", exact: true }).click();
  // The fish question is new for this branch, so it's asked next.
  await expect(page.getByRole("heading", { name: "How often do you eat fish?" })).toBeVisible();
  await page.getByRole("radio", { name: "Rarely or never", exact: true }).click();
  await page.waitForURL("**/summary");
  await expect(page.getByText("You follow a non-vegetarian diet.")).toBeVisible();
  await expect(page.getByText("You eat fish rarely.")).toBeVisible();
  await expect(page.getByText(/You have dairy/)).toHaveCount(0);
});

test("email gate validates, and unlocking is idempotent", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  await runAssessment(page, tracker, { sex: "Male" });
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByRole("button", { name: "See my report" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();

  await unlock(page, "idem.e2e@example.com");
  const first = page.url();
  // Visiting the summary again goes straight back to the same report.
  await page.goto("/summary");
  await expect(page).toHaveURL(first);
});

test("unknown report links show a friendly 404", async ({ page }) => {
  const res = await page.goto("/result/this-token-does-not-exist-123");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /We couldn’t find that/ })).toBeVisible();
});

test("answers can't be submitted for questions that aren't on screen", async ({ page }) => {
  await startAssessment(page);
  const res = await browserFetch(page, "/api/answer", { method: "POST", body: { key: "medications", input: { values: ["none"] } } });
  expect(res.status).toBe(409);
  const bad = await browserFetch(page, "/api/answer", { method: "POST", body: { key: "name", input: { text: "<script>" } } });
  expect(bad.status).toBe(422);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("full assessment on a phone", async ({ page }) => {
    const tracker = trackView(page);
    await startAssessment(page);
    const { end } = await runAssessment(page, tracker, { sex: "Female", pregnancy: "None of these" });
    expect(end).toBe("summary");
    await unlock(page, "mobile.e2e@example.com");
    await expect(page.getByRole("heading", { name: "Made for Sam" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test("the browser Back button returns to the previous question, and Forward goes ahead again", async ({ page }) => {
  await startAssessment(page);
  await page.locator("main form input").fill("Tara");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Female", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How old are you?" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/q\?q=sex$/);
  await expect(page.getByRole("radio", { name: "Female", exact: true })).toHaveAttribute("aria-checked", "true");

  await page.goForward();
  await expect(page.getByRole("heading", { name: "How old are you?" })).toBeVisible();
});

test("an email typo gets a 'Did you mean…?' prompt before the report is sent", async ({ page }) => {
  const tracker = trackView(page);
  await startAssessment(page);
  await runAssessment(page, tracker, { sex: "Male" });
  await page.getByLabel("Email address").fill("typo.e2e@gmial.com");
  await page.getByRole("button", { name: "See my report" }).click();
  await expect(page.getByText("Did you mean")).toBeVisible();
  await page.getByRole("button", { name: "Yes, use typo.e2e@gmail.com" }).click();
  await page.waitForURL("**/result/**", { timeout: 20_000 });
  await expect(page.getByText(/sent to ty\*\*\*@gmail\.com/)).toBeVisible();
});
