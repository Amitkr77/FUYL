import { expect, test } from "@playwright/test";
import { E2E } from "./constants";
import { adminLogin } from "./helpers";

/**
 * Mirrors launch: the assessment is closed until a reviewed version is
 * published. Admins sign in with emailed one-time codes (each role once; the
 * sessions are saved for the admin suite). The reviewer approves the seed and
 * the admin publishes v1.
 */
test.describe.configure({ mode: "serial" });

test("the public assessment is closed until something is published", async ({ request }) => {
  // A request from our own pages (the API refuses cross-site or origin-less writes).
  const res = await request.post("/api/session", { data: { consent: true }, headers: { origin: E2E.baseURL } });
  expect(res.status()).toBe(503);
  expect((await res.json()).code).toBe("NOT_LIVE");
});

test("fuyl.in data syncs from the store (fake fuyl.in in tests)", async ({ request }) => {
  const unauth = await request.post("/api/cron/sync");
  expect(unauth.status()).toBe(401);
  const res = await request.post("/api/cron/sync", { headers: { Authorization: `Bearer ${E2E.cronSecret}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("success");
  expect(body.ingredients.count).toBe(45);
  expect(body.ingredients.unmatched).toEqual([]);
  expect(body.labels.map((l: { status: string }) => l.status)).toEqual(["baseline", "baseline"]);
});

test("reviewer signs in with an emailed code, approves everything, cannot publish", async ({ page }) => {
  await adminLogin(page, "reviewer");
  await page.context().storageState({ path: E2E.authFile("reviewer") });
  await page.goto("/admin/review");
  await expect(page.getByRole("button", { name: /Publish v/ })).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Approve all/ }).click();
  await expect(page.getByText("Everything is approved")).toBeVisible();
});

test("admin signs in with an emailed code, publishes v1, and the assessment opens", async ({ page, request }) => {
  await adminLogin(page, "admin");
  await page.context().storageState({ path: E2E.authFile("admin") });
  await page.goto("/admin/review");
  await expect(page.getByText("No errors")).toBeVisible();
  await page.getByPlaceholder(/e\.g\. Reviewed/).fill("E2E initial release");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Publish v1" }).click();
  await expect(page.getByText("Published v1.")).toBeVisible();

  const res = await request.post("/api/session", { data: { consent: true }, headers: { origin: E2E.baseURL } });
  expect(res.status()).toBe(201);
});
