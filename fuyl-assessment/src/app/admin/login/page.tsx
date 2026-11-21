import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in · FUYL Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass-strong w-full max-w-sm rounded-[var(--radius-glass)] p-8">
        <Image src="/logo.webp" alt="FUYL" width={72} height={30} className="mx-auto h-7 w-auto" />
        <h1 className="mt-6 text-center font-display text-3xl text-forest">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-muted">Wellness assessment</p>
        <LoginForm />
      </div>
    </main>
  );
}
