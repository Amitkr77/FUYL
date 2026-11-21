import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated lazily on first use so `next build`
 * doesn't fail on machines that haven't been given secrets yet.
 */
const schema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("fuyl_assessment"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3002"),
  FUYL_STORE_URL: z.string().url().default("https://fuyl.in"),
  FUYL_PRODUCT_HANDLE: z.string().min(1).default("fuyl-complete"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("FUYL <hello@fuyl.in>"),
  CRON_SECRET: z.string().optional(),
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
