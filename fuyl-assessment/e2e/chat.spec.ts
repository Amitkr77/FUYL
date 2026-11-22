import { expect, test, type Page } from "@playwright/test";
import type { ChatView } from "../src/chat/types";
import { E2E } from "./constants";
import { browserFetch, readMail } from "./helpers";

/**
 * Assisted assessment (chat). The e2e environment points the app at a fake
 * Groq API, so the AI path runs end to end without network or cost.
 */

async function chatState(page: Page): Promise<ChatView> {
  const r = await browserFetch(page, "/api/chat");
  return JSON.parse(r.text).chat as ChatView;
}

const aiCalls = async (page: Page) => ((await (await page.request.get(`http://127.0.0.1:${E2E.storePort}/__ai`)).json()) as { calls: number }).calls;

async function startChat(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with an advisor" }).click();
  await page.waitForURL("**/chat");
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("What should we call you?")).toBeVisible({ timeout: 15_000 });
  await settled(page);
}

/** Wait until the advisor has finished "typing". */
async function settled(page: Page) {
  await expect(page.getByLabel("Advisor is typing")).toHaveCount(0, { timeout: 15_000 });
}

async function say(page: Page, text: string) {
  const before = (await chatState(page)).messages.length;
  await page.getByLabel("Your reply").fill(text);
  await page.getByLabel("Your reply").press("Enter");
  await expect.poll(async () => (await chatState(page)).messages.length, { timeout: 15_000 }).toBeGreaterThan(before);
  await settled(page);
}

async function tap(page: Page, labels: string[], multi: boolean) {
  const before = (await chatState(page)).messages.length;
  const chips = page.getByRole("group", { name: "Suggested answers" });
  for (const l of labels) await chips.getByRole("button", { name: l, exact: true }).click();
  if (multi) await chips.getByRole("button", { name: /^Send/ }).click();
  await expect.poll(async () => (await chatState(page)).messages.length, { timeout: 15_000 }).toBeGreaterThan(before);
  await settled(page);
}

/** Free-text replies for some questions, chips for the rest — the way people actually mix them. */
const TYPED: Record<string, string> = {
  name: "hi, my name is riya",
  age: "I'm thirty one",
  diet: "mostly vegetarian",
  sleep_hours: "about 6 hours",
  stress: "honestly very stressed",
  conditions: "no nothing like that",
};
const TAPPED: Record<string, string[]> = {
  sex: ["Female"],
  pregnancy: ["None of these"],
  priorities: ["Energy", "Sleep"],
};
const NEUTRAL = ["None of these", "All good", "No", "I feel energised", "I sleep well most nights", "Comfortable and regular", "Rarely", "No, I feel sharp", "Never", "Lightly active", "15–30 minutes a day", "2–3", "Under 4 hours", "0–1", "Every day", "Twice a week or more", "A few days", "None of these / doesn't apply", "Most days", "A few times a week"];

async function runChat(page: Page, max = 50) {
  for (let i = 0; i < max; i++) {
    const chat = await chatState(page);
    if (chat.status !== "active" || !chat.ask) return chat;
    const ask = chat.ask;
    if (TYPED[ask.key]) await say(page, TYPED[ask.key]);
    else if (ask.type === "number" || ask.type === "text") await say(page, "30");
    else {
      const labels = (ask.options ?? []).map((o) => o.label);
      const pick = TAPPED[ask.key] ?? [NEUTRAL.find((n) => labels.includes(n)) ?? labels[0]];
      await tap(page, pick, ask.type === "multi");
    }
  }
  throw new Error("chat did not finish");
}

test("the welcome screen offers both assessments; the chat asks for an email first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start the assessment" })).toBeVisible();
  await page.getByRole("button", { name: "Chat with an advisor" }).click();
  await page.waitForURL("**/chat");
  await expect(page.getByRole("heading", { name: "Meet your FUYL advisor" })).toBeVisible();

  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await page.getByLabel("Your email").fill("riya@gmial.com");
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Please tick the box to continue.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my assessment" }).click();
  await expect(page.getByText("Did you mean")).toBeVisible();
  await page.getByRole("button", { name: "riya@gmail.com" }).click();
  await expect(page.getByText("What should we call you?")).toBeVisible();
  await expect(page.getByText("Your report will go to ri***@gmail.com")).toBeVisible();
});

test("a full chat — typed and tapped answers, AI understanding — ends in the report and the email", async ({ page }) => {
  test.setTimeout(180_000);
  const email = "chat.riya@example.com";
  const callsBefore = await aiCalls(page);
  await startChat(page, email);

  await say(page, TYPED.name);
  await expect(page.getByText("Nice to meet you, Riya.")).toBeVisible();

  const done = await runChat(page);
  expect(done.status).toBe("complete");
  // Typed replies went through the (fake) AI, whose acknowledgements appear in the chat.
  expect(await aiCalls(page)).toBeGreaterThan(callsBefore);
  await expect(page.getByText("Lovely, thanks for sharing.").first()).toBeVisible();

  // Recap shows what was understood from free text.
  await expect(page.getByText("Here's what I heard")).toBeVisible();
  await expect(page.getByText(/vegetarian/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Looks right, show my results" }).click();
  await page.waitForURL("**/result/**", { timeout: 30_000 });
  await expect(page.getByText(/Riya/).first()).toBeVisible();

  await expect.poll(async () => (await readMail(page, email)).length, { timeout: 15_000 }).toBeGreaterThan(0);
});

test("a refresh resumes the chat where it left off", async ({ page }) => {
  await startChat(page, "chat.resume@example.com");
  await say(page, "Meera");
  await expect(page.getByText("Nice to meet you, Meera.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Nice to meet you, Meera.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Suggested answers" }).getByRole("button", { name: "Female", exact: true })).toBeVisible();
  // The welcome screen offers to continue the chat.
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your chat" }).click();
  await page.waitForURL("**/chat");
});

test("urgent symptoms get a doctor/helpline reply and the questionnaire waits", async ({ page }) => {
  await startChat(page, "chat.urgent@example.com");
  await say(page, "I have chest pain right now");
  await expect(page.getByText(/call 112/)).toBeVisible();
  expect((await chatState(page)).ask?.key).toBe("name");
});

test("if the AI is down, the chat carries on with built-in understanding", async ({ page }) => {
  await startChat(page, "chat.fallback@example.com");
  await say(page, "Kabir");
  await tap(page, ["Male"], false);
  await say(page, "__ai_down 34");
  // Understood without AI: the age is saved and the next question (top priorities) is asked.
  await expect(page.getByText(/top priorities right now/)).toBeVisible();
  expect((await chatState(page)).ask?.key).toBe("priorities");
});

test("under 19 stops inside the chat, with a way to correct the age", async ({ page }) => {
  await startChat(page, "chat.teen@example.com");
  await say(page, "Ananya");
  await tap(page, ["Female"], false);
  await say(page, "17");
  const chat = await chatState(page);
  expect(chat.status).toBe("stopped");
  await expect(page.getByRole("link", { name: "I made a mistake, change my answer" })).toBeVisible();
  await expect(page.getByLabel("Your reply")).toHaveCount(0);
});

test("the chat API rejects junk and answers for questions not being asked", async ({ page }) => {
  await startChat(page, "chat.api@example.com");
  const tooLong = await browserFetch(page, "/api/chat", { method: "POST", body: { text: "x".repeat(600) } });
  expect(tooLong.status).toBe(400);
  const wrongKey = await browserFetch(page, "/api/chat", { method: "POST", body: { choice: { key: "conditions", values: ["none"] } } });
  expect(wrongKey.status).toBe(200);
  expect((await chatState(page)).ask?.key).toBe("name");
  const finishEarly = await browserFetch(page, "/api/chat/finish", { method: "POST" });
  expect(finishEarly.status).toBe(409);
});
