import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AssistedFlow } from "@/components/chat/AssistedFlow";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ASSISTED, CHAT_CONSENT_TEXT } from "@/kb/copy";
import { getAssistedSettings } from "@/lib/assisted";
import { chatView } from "@/lib/chat";
import { loadSession } from "@/lib/session";

export const metadata: Metadata = { title: "Assisted assessment", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Assisted assessment: resumes this browser's chat if there is one, otherwise asks for the email first. */
export default async function ChatPage() {
  const session = await loadSession();
  if (session?.mode === "assisted" && session.status === "submitted" && session.resultToken) redirect(`/result/${session.resultToken}`);
  const resuming = session?.mode === "assisted" && session.chat;
  if (!resuming && !(await getAssistedSettings()).enabled) redirect("/");
  const initial = resuming ? await chatView(session) : null;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col px-3 py-6 sm:px-4 sm:py-10">
        <Suspense>
          <AssistedFlow initial={initial} copy={ASSISTED} consentText={CHAT_CONSENT_TEXT} />
        </Suspense>
      </main>
    </>
  );
}
