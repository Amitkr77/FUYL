import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { buildResult, nextStep, type BlockKey } from "@/engine";
import { EmailGate } from "@/components/flow/EmailGate";
import { Reveal } from "@/components/motion/Reveal";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { getKnowledgeBase } from "@/lib/kb";
import { loadSession, sessionAnswers } from "@/lib/session";
import { LOADER_STEPS } from "@/kb/copy";

export const metadata: Metadata = { title: "Your summary", robots: { index: false } };
export const dynamic = "force-dynamic";

const BLOCK_TITLE: Record<BlockKey, string> = {
  about: "About you",
  lifestyle: "Your lifestyle",
  feel: "How you feel",
  safety: "Your health",
};

export default async function SummaryPage() {
  const session = await loadSession();
  if (!session) redirect("/");
  if (session.status === "submitted" && session.resultToken) redirect(`/result/${session.resultToken}`);

  const kb = await getKnowledgeBase();
  const answers = sessionAnswers(session);
  if (nextStep(kb, answers).kind !== "complete") redirect("/q");

  const result = buildResult(kb, answers);
  const groups = (Object.keys(BLOCK_TITLE) as BlockKey[])
    .map((block) => ({ block, lines: result.summary.filter((l) => l.block === block) }))
    .filter((g) => g.lines.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
        <Reveal className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-teal">Step 2 of 3 · Summary</p>
          <h1 className="mt-4 text-balance font-display text-4xl leading-tight text-forest sm:text-5xl">
            Here&rsquo;s what you told us{result.name ? `, ${result.name}` : ""}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Check it looks right — tap any line to change it.</p>
        </Reveal>

        <div className="mt-10 space-y-4">
          {groups.map((g, gi) => (
            <Reveal key={g.block} delay={gi * 0.05} className="glass rounded-[var(--radius-glass)] p-6 sm:p-8">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-teal">{BLOCK_TITLE[g.block]}</h2>
              <ul className="mt-4 divide-y divide-line/50">
                {g.lines.map((l) => (
                  <li key={l.questionKey}>
                    <Link
                      href={`/q?edit=${encodeURIComponent(l.questionKey)}`}
                      className="group flex items-start justify-between gap-4 py-3 text-[15px] leading-relaxed text-forest"
                    >
                      <span>{l.text}</span>
                      <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted/50 transition-colors group-hover:text-teal" aria-label="Edit" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <EmailGate
            teaser={{ count: result.areas.length, names: result.areas.map((a) => a.name) }}
            loaderSteps={LOADER_STEPS}
          />
        </Reveal>
      </main>
    </>
  );
}
