/** Shared, test-only settings for the e2e environment. Not used by the app. */
export const E2E = {
  appPort: 3100,
  storePort: 3101,
  get baseURL() {
    return `http://127.0.0.1:${this.appPort}`;
  },
  dbName: "fuyl_assessment_e2e",
  productHandle: "fuyl-complete",
  sessionSecret: "e2e-only-session-secret-0123456789-abcdefghijklmnop",
  cronSecret: "e2e-only-cron-secret",
  admin: { email: "admin@e2e.test", name: "E2E Admin", role: "admin", password: "E2E-Admin-Password-1" },
  reviewer: { email: "reviewer@e2e.test", name: "E2E Reviewer", role: "reviewer", password: "E2E-Reviewer-Password-1" },
} as const;
