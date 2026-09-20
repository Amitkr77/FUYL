import Link from "next/link";

export interface Tab {
  id: string;
  label: string;
  href: string;
}

interface TabNavProps {
  tabs: Tab[];
  activeId: string;
}

export function TabNav({ tabs, activeId }: TabNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-hide">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeId === tab.id
              ? "border-[#558476] text-[#315f52]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
