import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatStart } from "@/components/chat/ChatStart";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ASSISTED, CHAT_CONSENT_TEXT } from "@/kb/copy";
import { getAssistedSettings } from "@/lib/assisted";
import { loadSession } from "@/lib/session";

export const metadata: Metadata = { title: "Assisted assessment", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Assisted assessment entry: email first; an assessment already in progress in this browser just continues. */
export default async function AssistedStartPage() {
  const session = await loadSession();
  if (session?.mode === "assisted") {
    if (session.status === "submitted" && session.resultToken) redirect(`/result/${session.resultToken}`);
    if (session.status !== "submitted") redirect(session.status === "complete" ? "/summary" : "/q");
  }
  if (!(await getAssistedSettings()).enabled) redirect("/");

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
        <Suspense>
          <ChatStart copy={ASSISTED} consentText={CHAT_CONSENT_TEXT} />
        </Suspense>
      </main>
    </>
  );
}
