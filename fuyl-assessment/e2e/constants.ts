/** Shared, test-only settings for the e2e environment. Not used by the app. */
export const E2E = {
  appPort: 3100,
  storePort: 3101,
  smtpPort: 3102,
  get baseURL() {
    return `http://127.0.0.1:${this.appPort}`;
  },
  dbName: "fuyl_assessment_e2e",
  productHandle: "fuyl-complete",
  sessionSecret: "e2e-only-session-secret-0123456789-abcdefghijklmnop",
  cronSecret: "e2e-only-cron-secret",
  admin: { email: "admin@e2e.test", name: "E2E Admin", role: "admin" },
  reviewer: { email: "reviewer@e2e.test", name: "E2E Reviewer", role: "reviewer" },
  authFile: (who: "admin" | "reviewer") => `e2e/.auth/${who}.json`,
} as const;
