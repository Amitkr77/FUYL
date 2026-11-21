import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm, type DemoAccount } from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/admin/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in · FUYL Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Demo accounts are only exposed when DEMO_LOGIN=true (local demos — never production). */
function demoAccounts(): DemoAccount[] {
  const e = env();
  if (e.DEMO_LOGIN !== "true") return [];
  const out: DemoAccount[] = [];
  if (e.DEMO_ADMIN_EMAIL && e.DEMO_ADMIN_PASSWORD) out.push({ label: "Demo Admin", email: e.DEMO_ADMIN_EMAIL, password: e.DEMO_ADMIN_PASSWORD });
  if (e.DEMO_REVIEWER_EMAIL && e.DEMO_REVIEWER_PASSWORD) out.push({ label: "Demo Reviewer", email: e.DEMO_REVIEWER_EMAIL, password: e.DEMO_REVIEWER_PASSWORD });
  return out;
}

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const demo = demoAccounts();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass-strong w-full max-w-sm rounded-[var(--radius-glass)] p-8">
        <Image src="/logo.webp" alt="FUYL" width={72} height={30} className="mx-auto h-7 w-auto" />
        <h1 className="mt-6 text-center font-display text-3xl text-forest">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-muted">Wellness assessment</p>
        {demo.length > 0 && (
          <p className="mt-5 rounded-xl bg-[#fdf0e3] px-3 py-2 text-center text-xs text-[#9a5a1c]">
            Demo mode is on — demo credentials are shown on this page. Turn off <code>DEMO_LOGIN</code> before going live.
          </p>
        )}
        <LoginForm demo={demo} />
      </div>
    </main>
  );
}
