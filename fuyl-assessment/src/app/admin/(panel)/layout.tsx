import type { Metadata } from "next";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft } from "@/lib/admin/kbStore";
import { reviewCounts } from "@/kb/draft";
import { connectDB } from "@/lib/db";
import { SyncState } from "@/models/store";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · FUYL Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const draft = await getDraft();
  await connectDB();
  const sync = await SyncState.findById("singleton", { labelReviewNeeded: 1 }).lean();
  const pending = reviewCounts(draft.kb, draft.reviews).pending.length;

  return (
    <div className="relative z-0 flex min-h-dvh bg-[#f7f9f3]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line/60 bg-cream/60 px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <Image src="/logo.webp" alt="FUYL" width={64} height={26} className="h-6 w-auto" />
          <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav role={admin.role} badges={{ "/admin/review": pending, "/admin/sync": sync?.labelReviewNeeded ? 1 : 0 }} />
        </div>
        <div className="mt-4 border-t border-line/60 px-3 pt-4">
          <p className="truncate text-sm font-medium text-forest">{admin.name}</p>
          <p className="truncate text-xs text-muted">
            {admin.email} · {admin.role === "admin" ? "Admin" : "Reviewer"}
          </p>
          <form action={logoutAction} className="mt-3">
            <button className="inline-flex items-center gap-1.5 text-xs text-teal-deep hover:text-forest">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Compact nav for small screens */}
        <details className="border-b border-line/60 bg-cream/60 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-forest">
            FUYL Admin <span className="text-xs text-muted">Menu</span>
          </summary>
          <div className="px-2 pb-4">
            <AdminNav role={admin.role} badges={{ "/admin/review": pending }} />
          </div>
        </details>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
