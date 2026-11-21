"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  ClipboardCheck,
  FlaskConical,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Leaf,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";

const SECTIONS = [
  { title: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Content",
    items: [
      { href: "/admin/content/question", label: "Questions", icon: HelpCircle },
      { href: "/admin/content/area", label: "Focus areas", icon: Target },
      { href: "/admin/content/ingredient", label: "Ingredients", icon: Leaf },
      { href: "/admin/content/safety", label: "Safety rules", icon: ShieldAlert },
      { href: "/admin/settings", label: "Engine settings", icon: Settings2 },
    ],
  },
  {
    title: "Quality",
    items: [
      { href: "/admin/simulator", label: "Flow simulator", icon: FlaskConical },
      { href: "/admin/review", label: "Review & publish", icon: ClipboardCheck },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/submissions", label: "Submissions", icon: Inbox },
      { href: "/admin/sync", label: "fuyl.in sync", icon: RefreshCw },
      { href: "/admin/activity", label: "Activity log", icon: Activity },
      { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
    ],
  },
];

export function AdminNav({ role, badges }: { role: "admin" | "reviewer"; badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-6">
      {SECTIONS.map((s) => (
        <div key={s.title || "main"}>
          {s.title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/70">{s.title}</p>}
          <ul className="space-y-0.5">
            {s.items
              .filter((i) => !("adminOnly" in i && i.adminOnly) || role === "admin")
              .map(({ href, label, icon: Icon, ...rest }) => {
                const active = "exact" in rest && rest.exact ? pathname === href : pathname.startsWith(href);
                const badge = badges[href];
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                        active ? "bg-forest text-white" : "text-forest hover:bg-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="flex-1">{label}</span>
                      {badge ? (
                        <span className={clsx("rounded-full px-1.5 text-[10px] font-semibold", active ? "bg-white/20" : "bg-ember/15 text-ember")}>{badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
