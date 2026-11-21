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
  APP_URL: z.string().url().default("http://localhost:3002"),
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
  // Demo sign-in buttons on /admin/login (fill in these credentials). Never enable in production.
  DEMO_LOGIN: optional(z.enum(["true", "false"])),
  DEMO_ADMIN_EMAIL: optional(z.string().email()),
  DEMO_ADMIN_PASSWORD: optional(z.string()),
  DEMO_REVIEWER_EMAIL: optional(z.string().email()),
  DEMO_REVIEWER_PASSWORD: optional(z.string()),
});

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
