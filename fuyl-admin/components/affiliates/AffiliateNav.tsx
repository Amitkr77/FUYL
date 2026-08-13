"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Banknote, LayoutDashboard, ListChecks, Settings, Users, Workflow } from "lucide-react";

const items = [
  { label: "Overview", href: "/affiliates", icon: LayoutDashboard, exact: true },
  { label: "Programs", href: "/affiliates/programs", icon: Workflow },
  { label: "Affiliates", href: "/affiliates/members", icon: Users },
  { label: "Commissions", href: "/affiliates/commissions", icon: ListChecks },
  { label: "Payouts", href: "/affiliates/payouts", icon: Banknote },
  { label: "Analytics", href: "/affiliates/analytics", icon: BarChart3 },
  { label: "Settings", href: "/affiliates/settings", icon: Settings },
];

export function AffiliateNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Affiliate sections" className="overflow-x-auto scrollbar-hide border-b border-slate-200">
      <div className="flex min-w-max gap-1">
        {items.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-[#558476] text-[#315f52]"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
