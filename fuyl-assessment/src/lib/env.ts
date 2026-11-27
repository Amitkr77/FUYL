import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated lazily on first use so `next build`
 * doesn't fail on machines that haven't been given secrets yet.
 */
/** Treat blank values (e.g. `SMTP_HOST=`) as "not set". */
const optional = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? undefined : v), s.optional());

const schema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("fuyl_assessment"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  /** Public URL used in emailed links. On Vercel, falls back to the deployment's own URL (see resolveAppUrl). */
  APP_URL: z.preprocess((v) => resolveAppUrl(v as string | undefined, process.env), z.string().url()),
  FUYL_STORE_URL: z.string().url().default("https://fuyl.in"),
  FUYL_PRODUCT_HANDLE: z.string().min(1).default("fuyl-complete"),
  // SMTP for the report email. Without SMTP_HOST, emails are skipped (logged).
  SMTP_HOST: optional(z.string()),
  SMTP_PORT: z.preprocess((v) => (v === "" || v === undefined ? 587 : Number(v)), z.number().int().min(1).max(65535)),
  /** "true" for implicit TLS (usually port 465); otherwise STARTTLS is required. Defaults by port. */
  SMTP_SECURE: optional(z.enum(["true", "false"])),
  SMTP_USER: optional(z.string()),
  SMTP_PASS: optional(z.string()),
  /** TEST ONLY: allow an SMTP server without TLS (the e2e suite's local fake). Never set in production. */
  SMTP_ALLOW_INSECURE: optional(z.enum(["true", "false"])),
  EMAIL_FROM: z.string().default("FUYL <hello@fuyl.in>"),
  CRON_SECRET: z.string().optional(),
  /** Cloudflare Turnstile secret. When set, starting an assessment and unlocking a report require the human check. */
  TURNSTILE_SECRET_KEY: optional(z.string()),
  /** Minutes of inactivity before an unfinished assisted assessment gets its one "continue" reminder. */
  REMINDER_IDLE_MINUTES: z.preprocess((v) => (v === "" || v === undefined ? 60 : Number(v)), z.number().int().min(0).max(7 * 24 * 60)),
  // Assisted assessment AI (Groq, OpenAI-compatible). Without a key the chat uses its built-in understanding.
  GROQ_API_KEY: optional(z.string()),
  GROQ_BASE_URL: z.preprocess((v) => (v === "" || v === undefined ? "https://api.groq.com/openai/v1" : v), z.string().url()),
  // Demo sign-in buttons on /admin/login (fill in these credentials). Never enable in production.
  DEMO_LOGIN: optional(z.enum(["true", "false"])),
  DEMO_ADMIN_EMAIL: optional(z.string().email()),
  DEMO_ADMIN_PASSWORD: optional(z.string()),
  DEMO_REVIEWER_EMAIL: optional(z.string().email()),
  DEMO_REVIEWER_PASSWORD: optional(z.string()),
});

/**
 * The app's public URL for links in emails. An explicit APP_URL wins — except a
 * localhost one on a Vercel deployment (a copied local .env), which would send
 * people links that don't open. Then Vercel's own URLs are used: the production
 * domain on production, the deployment URL on previews.
 */
export function resolveAppUrl(raw: string | undefined, e: Record<string, string | undefined>): string {
  const set = raw?.trim();
  const local = !set || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(set);
  if (set && (!local || !e.VERCEL)) return set;
  const host = e.VERCEL_ENV === "production" ? e.VERCEL_PROJECT_PRODUCTION_URL || e.VERCEL_URL : e.VERCEL_URL || e.VERCEL_PROJECT_PRODUCTION_URL;
  if (e.VERCEL && host) return `https://${host}`;
  return set || "http://localhost:3002";
}

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
