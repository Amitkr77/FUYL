import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Player } from "@/components/flow/Player";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { frontierView, questionView, type FlowState } from "@/flow/state";
import { assistedOptions } from "@/lib/chat";
import { getKnowledgeBase } from "@/lib/kb";
import { loadSession, sessionAnswers } from "@/lib/session";

export const metadata: Metadata = { title: "Your assessment", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * The current question is rendered on the server, so it's in the first HTML
 * response — no loading skeleton and no extra round-trip after JavaScript
 * loads (that waterfall cost ~3 s on a slow phone connection).
 */
export default async function QuestionPage({ searchParams }: { searchParams: Promise<{ q?: string; edit?: string }> }) {
  const { q, edit } = await searchParams;
  const session = await loadSession();
  if (!session) redirect("/");
  if (session.status === "submitted" && session.resultToken) redirect(`/result/${session.resultToken}`);

  const kb = await getKnowledgeBase();
  const answers = sessionAnswers(session);
  const wanted = edit ?? q;
  const view = (wanted && /^[a-z0-9][a-z0-9_-]{0,59}$/.test(wanted) && questionView(kb, answers, session.path, wanted)) || frontierView(kb, answers, session.path);
  if (view.kind === "complete" && !edit) redirect("/summary");
  const initialState: FlowState = { view, path: session.path };

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col px-4 py-5 sm:py-8">
        <Suspense>
          <Player initialState={initialState} assisted={assistedOptions(session)} />
        </Suspense>
      </main>
    </>
  );
}
