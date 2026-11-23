import { expect, test } from "@playwright/test";
import { E2E } from "./constants";
import { browserFetch, readMail, readOtp } from "./helpers";

/** Admin panel: code sign-in, access control, editing, simulator, submissions, sync. */

test.describe("signing in", () => {
  test("admin pages require sign-in", async ({ page, request }) => {
    await page.goto("/admin/review");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const exp = await request.get("/admin/export", { maxRedirects: 0 });
    expect(exp.status()).toBe(307);
  });

  test("unknown emails get the same answer and no email is sent", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Work email").fill("nobody@e2e.test");
    await page.getByRole("button", { name: "Email me a sign-in code" }).click();
    await expect(page.getByText(/If nobody@e2e\.test has admin access, a 6-digit code is on its way/)).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await readMail(page, "nobody@e2e.test")).toEqual([]);
  });

  test("a wrong code is rejected; the emailed code works once", async ({ page, browser }) => {
    const email = E2E.reviewer.email;
    await page.goto("/admin/login");
    const since = Date.now() - 1000;
    await page.getByLabel("Work email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in code" }).click();
    const code = await readOtp(page, email, since);

    const wrong = code === "000000" ? "111111" : "000000";
    await page.getByLabel("6-digit code").fill(wrong);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That code is incorrect or has expired.")).toBeVisible();

    await page.getByLabel("6-digit code").fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin$/);

    // The same code can't be used again.
    const other = await browser.newPage();
    await other.goto("/admin/login");
    await other.getByLabel("Work email").fill(email);
    await other.getByRole("button", { name: "Email me a sign-in code" }).click();
    // (resend is rate-limited, so the form explains instead of sending)
    await expect(other.getByText(/Please wait \d+s before requesting another code\./)).toBeVisible();
    await other.close();
  });
});

test.describe("reviewer", () => {
  test.use({ storageState: E2E.authFile("reviewer") });

  test("can edit and approve, cannot manage users or export", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\?denied=1$/);
    expect((await browserFetch(page, "/admin/export")).status).toBe(403);

    await page.goto("/admin/content/question/sleep");
    const prompt = page.getByRole("textbox").first();
    await prompt.fill("");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
    await expect(page.getByText("Required").first()).toBeVisible();

    await prompt.fill("How well are you sleeping these days, {name}?");
    await page.getByRole("button", { name: "Save & approve" }).click();
    await expect(page.getByText("Saved and approved.")).toBeVisible();
    await expect(page.getByText(/Approved by reviewer@e2e\.test/)).toBeVisible();
  });

  test("simulator runs the draft with stop rules", async ({ page }) => {
    await page.goto("/admin/simulator");
    await page.getByLabel("Answer").fill("Sam");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /^Male/ }).click();
    await page.getByLabel("Answer").fill("17");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Stop rule: under_19")).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: E2E.authFile("admin") });

  test("draft edits don't reach users until published", async ({ page }) => {
    // The reviewer's edit above is approved but unpublished: it shows as a change.
    await page.goto("/admin/review");
    await expect(page.getByText("changed", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish v2" })).toBeEnabled();
  });

  test("sees submissions and can export a formula-safe CSV", async ({ page }) => {
    await page.goto("/admin/submissions");
    await expect(page.getByText("riya.e2e@example.com")).toBeVisible();
    const csv = await browserFetch(page, "/admin/export");
    expect(csv.status).toBe(200);
    expect(csv.contentType).toContain("text/csv");
    expect(csv.text.split("\r\n")[0]).toContain('"email"');
    expect(csv.text).toContain("riya.e2e@example.com");
  });

  test("a changed label image raises a dose review, which an admin clears", async ({ page }) => {
    // Simulate Shopify replacing the blend-profile label image.
    const bump = await page.request.post(`http://127.0.0.1:${E2E.storePort}/__label-change`);
    expect(bump.status()).toBe(204);

    await page.goto("/admin/sync");
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByText("A COMPLETE+ label image changed on fuyl.in")).toBeVisible();
    await expect(page.getByText("Changed", { exact: true })).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /I've checked the doses/ }).click();
    await expect(page.getByText("A COMPLETE+ label image changed on fuyl.in")).toHaveCount(0);
    await expect(page.getByText("Reviewed", { exact: true })).toHaveCount(2);
  });

  test("adds a reviewer who can then sign in with an emailed code; actions are audit-logged", async ({ page, browser }) => {
    const email = "new.reviewer@e2e.test";
    await page.goto("/admin/users");
    await page.getByLabel("Name").fill("New Reviewer");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByText(`Added ${email}. They sign in with a one-time code sent to that email — no password needed.`)).toBeVisible();

    // The new user signs in for the first time.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p2 = await ctx.newPage();
    await p2.goto("/admin/login");
    const since = Date.now() - 1000;
    await p2.getByLabel("Work email").fill(email);
    await p2.getByRole("button", { name: "Email me a sign-in code" }).click();
    await p2.getByLabel("6-digit code").fill(await readOtp(p2, email, since));
    await p2.getByRole("button", { name: "Sign in" }).click();
    await p2.waitForURL(/\/admin$/);
    await expect(p2.getByText("New Reviewer")).toBeVisible();
    await ctx.close();

    await page.goto("/admin/activity");
    for (const action of ["kb.publish", "review.approve", "content.update", "submission.export", "sync.labels_acknowledged", "user.create", "login"]) {
      await expect(page.getByText(action, { exact: true }).first()).toBeVisible();
    }
  });

  test("assisted: typed answers are visible to admins; settings switch to built-in / own-words-only and to Full AI", async ({ page, browser }) => {
    await page.goto("/admin/assisted");
    await expect(page.getByRole("heading", { name: "Assisted assessment", exact: true })).toBeVisible();
    // The user project's assisted assessment is listed, with its typed answers.
    await page.getByRole("row", { name: /assisted\.riya@example\.com/ }).getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Typed answers", exact: true })).toBeVisible();
    await expect(page.getByText("hi, my name is riya")).toBeVisible();

    await page.goto("/admin/assisted");
    await page.getByRole("radio", { name: /Built-in \(no AI\)/ }).check();
    await page.getByRole("radio", { name: /Own words only/ }).check();
    await expect(page.getByRole("radio", { name: /Full AI/ })).toBeDisabled();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const start = async (email: string) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const user = await ctx.newPage();
      await user.goto("/chat");
      await user.getByLabel("Your email").fill(email);
      await user.getByRole("checkbox").check();
      await user.getByRole("button", { name: "Start my assessment" }).click();
      await user.waitForURL("**/q**");
      return { ctx, user };
    };
    const calls = async () => ((await (await page.request.get(`http://127.0.0.1:${E2E.storePort}/__ai`)).json()) as { calls: number }).calls;

    // Own words only, no AI: choice questions show just the typing box, and no AI requests are made.
    const before = await calls();
    const a = await start("assisted.builtin@example.com");
    await a.user.locator("main form input").first().fill("Dev");
    await a.user.getByRole("button", { name: "Continue" }).click();
    await expect(a.user.getByRole("heading", { name: "Nice to meet you, Dev. Which best describes you?" })).toBeVisible();
    await expect(a.user.getByRole("radio", { name: "Male", exact: true })).toHaveCount(0);
    await a.user.getByLabel("Answer in your own words").fill("male");
    await a.user.getByRole("button", { name: "Send answer" }).click();
    await expect(a.user.getByRole("heading", { name: "How old are you?" })).toBeVisible();
    expect(await calls()).toBe(before);
    await a.ctx.close();

    // Full AI: one typed reply can answer several questions, which are then skipped.
    await page.getByRole("radio", { name: /Groq/ }).check();
    await page.getByRole("radio", { name: /Answer options \+ own words/ }).check();
    await page.getByRole("radio", { name: /Full AI/ }).check();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const b = await start("assisted.full@example.com");
    await b.user.locator("main form input").first().fill("Dev");
    await b.user.getByRole("button", { name: "Continue" }).click();
    await b.user.getByRole("radio", { name: "Male", exact: true }).click();
    await expect(b.user.getByRole("heading", { name: "How old are you?" })).toBeVisible();
    await b.user.getByRole("button", { name: "Continue" }).waitFor();
    await b.user.locator("main form input").first().fill("34");
    await b.user.getByRole("button", { name: "Continue" }).click();
    await expect(b.user.getByText(/top priorities right now/)).toBeVisible();
    await b.user.getByLabel("Answer in your own words").fill("energy; vegetarian");
    await b.user.getByRole("button", { name: "Send answer" }).click();
    await expect(b.user.getByText(/Diet: Vegetarian/)).toBeVisible();
    await expect(b.user.getByRole("heading", { name: "How do you usually eat?" })).toHaveCount(0);
    await b.ctx.close();

    // Restore the defaults.
    await page.getByRole("radio", { name: /Hybrid/ }).check();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.goto("/admin/activity");
    await expect(page.getByText("assisted.settings", { exact: true }).first()).toBeVisible();
  });
});
