"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Download, Link2 } from "lucide-react";

export interface Chapter {
  id: string;
  label: string;
}

/** Follows which chapter is on screen (for the highlighted nav item). */
function useActiveChapter(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function useCopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

/** Desktop: sticky sidebar with the person, their top areas, chapter links and actions. */
export function ReportSidebar({
  name,
  date,
  topAreas,
  wellness,
  chapters,
  pdfHref,
}: {
  name?: string;
  date: string;
  topAreas: { name: string; match: number }[];
  wellness?: { score: number; label: string };
  chapters: Chapter[];
  pdfHref: string;
}) {
  const active = useActiveChapter(chapters.map((c) => c.id));
  const { copied, copy } = useCopyLink();
  return (
    <aside className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] flex-col gap-5 overflow-y-auto lg:flex print:hidden" aria-label="Report navigation">
      <div className="glass-strong rounded-[var(--radius-glass)] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-deep">Wellness report</p>
        <p className="mt-2 font-display text-2xl leading-tight text-forest">{name ? `Made for ${name}` : "Your report"}</p>
        <p className="mt-1 text-xs text-muted">{date}</p>
        {wellness && (
          <p className="mt-4 flex items-baseline justify-between gap-3 rounded-2xl bg-white/60 px-3 py-2.5">
            <span className="text-xs text-muted">Wellness score</span>
            <span className="text-forest">
              <strong className="font-display text-2xl font-normal tabular-nums">{wellness.score}</strong>
              <span className="text-xs text-muted">/100 · {wellness.label}</span>
            </span>
          </p>
        )}
        {topAreas.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Your top focus areas">
            {topAreas.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-forest">
                  <span className="h-2 w-2 rounded-full bg-[#00897b]" aria-hidden /> {a.name}
                </span>
                <span className="tabular-nums text-muted">{a.match}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav className="glass rounded-[var(--radius-glass)] p-2" aria-label="Chapters">
        <ol>
          {chapters.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={active === c.id ? "true" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                  active === c.id ? "bg-forest text-white" : "text-forest hover:bg-white/60",
                )}
              >
                <span
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    active === c.id ? "bg-white/20" : "bg-sage/80",
                  )}
                >
                  {i + 1}
                </span>
                {c.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-2">
        <a href={pdfHref} download className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-medium text-white hover:bg-forest-soft">
          <Download className="h-4 w-4" aria-hidden /> Download PDF
        </a>
        <button type="button" onClick={copy} className="glass inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm text-forest hover:bg-white/80">
          {copied ? <Check className="h-4 w-4 text-teal-deep" aria-hidden /> : <Link2 className="h-4 w-4 text-teal-deep" aria-hidden />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </aside>
  );
}

/** Phones & tablets: a sticky chapter bar under the header, plus the actions. */
export function ReportChapterBar({ chapters, pdfHref }: { chapters: Chapter[]; pdfHref: string }) {
  const active = useActiveChapter(chapters.map((c) => c.id));
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/60 bg-mist/85 px-4 py-2 backdrop-blur-md lg:hidden print:hidden">
      <div className="flex items-center gap-2">
        <nav aria-label="Chapters" className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
          {chapters.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              aria-current={active === c.id ? "true" : undefined}
              className={clsx(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active === c.id ? "bg-forest text-white" : "bg-white/70 text-forest",
              )}
            >
              {i + 1}. {c.label}
            </a>
          ))}
        </nav>
        <a href={pdfHref} download aria-label="Download PDF" title="Download PDF" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-white">
          <Download className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
