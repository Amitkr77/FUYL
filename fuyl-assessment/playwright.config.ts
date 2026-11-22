import { mkdirSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E } from "./e2e/constants";

/**
 * End-to-end suite. Run with `npm run test:e2e` (builds first).
 *
 * Projects run in order:
 *   setup  → assessment closed before publish; admins sign in with emailed codes
 *            (sessions saved); reviewer approves; admin publishes v1
 *   user   → personas and flow behaviour against the published version
 *   admin  → roles, editing, simulator, submissions, sync
 * One worker keeps the shared database deterministic.
 */
// Saved admin sessions (signed in once per role in the setup project).
mkdirSync("e2e/.auth", { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: E2E.baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /setup\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "user", testMatch: /(personas|flow|chat)\.spec\.ts/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
    { name: "admin", testMatch: /admin\.spec\.ts/, dependencies: ["user"], use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx tsx --conditions=react-server e2e/server.ts",
    url: `${E2E.baseURL}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
