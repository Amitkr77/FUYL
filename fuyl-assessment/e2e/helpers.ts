import { expect, type Page } from "@playwright/test";
import type { ClientQuestion, View } from "../src/flow/state";
import { E2E } from "./constants";

/** Scripted answers by question key, using the labels users see. */
export type Script = Record<string, string | string[]>;

/**
 * Watch the app's own API responses to know which question is on screen —
 * the same information the UI renders, without coupling tests to markup.
 */
export function trackView(page: Page) {
  let view: View | null = null;
  page.on("response", async (res) => {
    if (!/\/api\/(session|answer|question)/.test(res.url())) return;
    try {
      const body = await res.json();
      if (body?.state?.view) view = body.state.view as View;
    } catch {
      /* non-JSON */
    }
  });
  return { get: () => view, reset: () => (view = null) };
}

export async function startAssessment(page: Page, query = "") {
  await page.goto(`/${query}`);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Start the assessment" }).click();
  await page.waitForURL("**/q");
}

const NEUTRAL = ["None of these", "All good", "No", "I feel energised", "I sleep well most nights", "Low — I feel balanced", "Comfortable and regular", "Rarely", "No, I feel sharp", "Never", "Non-vegetarian", "Lightly active", "15–30 minutes a day", "2–3", "4–5", "Under 4 hours", "0–1", "Every day", "Twice a week or more", "A few days", "None of these / doesn't apply"];

function neutralAnswer(q: ClientQuestion): string | string[] {
  if (q.type === "text") return "Sam";
  if (q.type === "number") return "30";
  const labels = (q.options ?? []).map((o) => o.label);
  const pick = NEUTRAL.find((n) => labels.includes(n)) ?? labels[0];
  return q.type === "multi" ? [pick] : pick;
}

/** Answer one question through the UI. */
export async function answer(page: Page, q: ClientQuestion, value: string | string[]) {
  if (q.type === "text" || q.type === "number") {
    await page.locator("main form input").fill(String(value));
    await page.getByRole("button", { name: "Continue" }).click();
  } else if (q.type === "single") {
    await page.getByRole("radio", { name: String(value), exact: true }).click();
  } else {
    for (const label of Array.isArray(value) ? value : [value]) await page.getByRole("checkbox", { name: label, exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
}

/**
 * Answer questions until the summary page or a stop screen. Returns the keys
 * asked, in order.
 */
export async function runAssessment(page: Page, tracker: ReturnType<typeof trackView>, script: Script = {}, max = 60) {
  const asked: string[] = [];
  // Let the page's own initial "where am I?" request settle first.
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < max; i++) {
    await expect
      .poll(() => (page.url().includes("/summary") ? "summary" : (tracker.get()?.kind ?? "loading")), { timeout: 15_000 })
      .not.toBe("loading");
    if (page.url().includes("/summary")) return { asked, end: "summary" as const };
    const view = tracker.get()!;
    if (view.kind === "stopped") return { asked, end: "stopped" as const, view };
    if (view.kind === "complete") {
      await page.waitForURL("**/summary");
      return { asked, end: "summary" as const };
    }
    const q = view.question;
    asked.push(q.key);
    tracker.reset();
    await answer(page, q, script[q.key] ?? neutralAnswer(q));
    // Moved on = the summary, or a view that isn't this same question (a late
    // response re-reporting the old question must not count).
    await expect
      .poll(
        () => {
          if (page.url().includes("/summary")) return true;
          const v = tracker.get();
          return v !== null && !(v.kind === "question" && v.question.key === q.key);
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  }
  throw new Error(`Assessment did not finish within ${max} questions`);
}

/**
 * Request from INSIDE the browser, so the app's Secure, httpOnly cookies are
 * sent exactly as for a real user (Playwright's API client won't send Secure
 * cookies over plain http in the test environment).
 */
export async function browserFetch(page: Page, path: string, init: { method?: string; body?: unknown } = {}) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, {
        method: init.method ?? "GET",
        headers: init.body ? { "Content-Type": "application/json" } : undefined,
        body: init.body ? JSON.stringify(init.body) : undefined,
        redirect: "manual",
      });
      return { status: res.status, type: res.type, contentType: res.headers.get("content-type") ?? "", text: res.type === "opaqueredirect" ? "" : await res.text() };
    },
    { path, init },
  );
}

export async function unlock(page: Page, email: string) {
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "See my report" }).click();
  await page.waitForURL("**/result/**", { timeout: 20_000 });
}

type Mail = { to: string[]; raw: string; at: number };

/** Emails the fake SMTP server received for an address, newest first. */
export async function readMail(page: Page, to: string): Promise<Mail[]> {
  const res = await page.request.get(`http://127.0.0.1:${E2E.storePort}/__mail?to=${encodeURIComponent(to)}`);
  return (await res.json()) as Mail[];
}

/** Wait for the newest sign-in code email sent after `since`, and return the code. */
export async function readOtp(page: Page, to: string, since: number): Promise<string> {
  let code: string | null = null;
  await expect
    .poll(
      async () => {
        const mail = (await readMail(page, to)).find((m) => m.at >= since && /sign-in code/i.test(m.raw));
        const match = mail?.raw.match(/^Subject: (\d{3}) (\d{3}) is your FUYL admin sign-in code/m);
        code = match ? match[1] + match[2] : null;
        return code;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();
  return code!;
}

/** Sign in the way a real admin does: email → one-time code from the inbox. */
export async function adminLogin(page: Page, who: "admin" | "reviewer") {
  const user = E2E[who];
  await page.goto("/admin/login");
  const since = Date.now() - 1000;
  await page.getByLabel("Work email").fill(user.email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("6-digit code")).toBeVisible();
  const code = await readOtp(page, user.email, since);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}
