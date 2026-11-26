import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { buildResult, nextStep, type BlockKey } from "@/engine";
import { EmailGate } from "@/components/flow/EmailGate";
import { Reveal } from "@/components/motion/Reveal";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { maskEmail } from "@/lib/email";
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
      <SmoothScroll />
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-deep">All done</p>
          <h1 className="mt-4 text-balance font-display text-4xl leading-tight text-forest sm:text-5xl">
            Your report is ready{result.name ? `, ${result.name}` : ""}
          </h1>
        </Reveal>

        <Reveal delay={0.05} className="mt-8">
          <EmailGate
            teaser={{ count: result.areas.length, names: result.areas.map((a) => a.name) }}
            loaderSteps={LOADER_STEPS}
            knownEmail={session.mode === "assisted" && session.email ? maskEmail(session.email) : undefined}
          />
        </Reveal>

        {/* Optional: review and edit answers (no longer a required step). */}
        <Reveal delay={0.1} className="mt-8">
          <details className="glass group rounded-[var(--radius-glass)] p-6 sm:p-8">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="font-medium text-forest">Review or change your answers</span>
              <span className="text-sm text-teal-deep group-open:hidden">Show</span>
              <span className="hidden text-sm text-teal-deep group-open:inline">Hide</span>
            </summary>
            <div className="mt-6 space-y-6">
              {groups.map((g) => (
                <div key={g.block}>
                  <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">{BLOCK_TITLE[g.block]}</h2>
                  <ul className="mt-2 divide-y divide-line/50">
                    {g.lines.map((l) => (
                      <li key={l.questionKey}>
                        <Link
                          href={`/q?edit=${encodeURIComponent(l.questionKey)}`}
                          className="group/line flex items-start justify-between gap-4 py-3 text-[15px] leading-relaxed text-forest"
                        >
                          <span>{l.text}</span>
                          <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted/50 transition-colors group-hover/line:text-teal" aria-label="Edit" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </Reveal>
      </main>
    </>
  );
}
