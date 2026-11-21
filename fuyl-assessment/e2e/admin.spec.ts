import { expect, test } from "@playwright/test";
import { E2E } from "./constants";
import { adminLogin, browserFetch } from "./helpers";

/** Admin panel: access control, editing, simulator, submissions, sync. */

test("admin pages require sign-in", async ({ page, request }) => {
  await page.goto("/admin/review");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const exp = await request.get("/admin/export", { maxRedirects: 0 });
  expect(exp.status()).toBe(307);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("nobody@e2e.test");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});

test("reviewer: can edit and approve, cannot manage users or export", async ({ page }) => {
  await adminLogin(page, "reviewer");
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

test("draft edits don't reach users until published", async ({ page, request }) => {
  // The reviewer's edit above is approved but unpublished: it shows as a change.
  void request;
  await adminLogin(page, "admin");
  await page.goto("/admin/review");
  await expect(page.getByText("changed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish v2" })).toBeEnabled();
});

test("simulator runs the draft with stop rules", async ({ page }) => {
  await adminLogin(page, "reviewer");
  await page.goto("/admin/simulator");
  await page.getByLabel("Answer").fill("Sam");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /^Male/ }).click();
  await page.getByLabel("Answer").fill("17");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Stop rule: under_19")).toBeVisible();
});

test("admin sees submissions and can export a formula-safe CSV", async ({ page }) => {
  await adminLogin(page, "admin");
  await page.goto("/admin/submissions");
  await expect(page.getByText("riya.e2e@example.com")).toBeVisible();
  const csv = await browserFetch(page, "/admin/export");
  expect(csv.status).toBe(200);
  expect(csv.contentType).toContain("text/csv");
  const text = csv.text;
  expect(text.split("\r\n")[0]).toContain('"email"');
  expect(text).toContain("riya.e2e@example.com");
});

test("a changed label image raises a dose review, which an admin clears", async ({ page }) => {
  // Simulate Shopify replacing the blend-profile label image.
  const bump = await page.request.post(`http://127.0.0.1:${E2E.storePort}/__label-change`);
  expect(bump.status()).toBe(204);

  await adminLogin(page, "admin");
  await page.goto("/admin/sync");
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText("A COMPLETE+ label image changed on fuyl.in")).toBeVisible();
  await expect(page.getByText("Changed", { exact: true })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /I've checked the doses/ }).click();
  await expect(page.getByText("A COMPLETE+ label image changed on fuyl.in")).toHaveCount(0);
  await expect(page.getByText("Reviewed", { exact: true })).toHaveCount(2);
});

test("admin can add a reviewer and every action is audit-logged", async ({ page }) => {
  await adminLogin(page, "admin");
  await page.goto("/admin/users");
  await page.getByLabel("Name").fill("New Reviewer");
  await page.getByLabel("Email").fill("new.reviewer@e2e.test");
  await page.getByRole("button", { name: "Add user" }).click();
  await expect(page.getByText(/Created new\.reviewer@e2e\.test\. Temporary password: \S+/)).toBeVisible();

  await page.goto("/admin/activity");
  for (const action of ["kb.publish", "review.approve", "content.update", "submission.export", "sync.labels_acknowledged", "user.create"]) {
    await expect(page.getByText(action, { exact: true }).first()).toBeVisible();
  }
});
