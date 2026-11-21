import { Suspense } from "react";
import { Welcome } from "@/components/flow/Welcome";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { CONSENT_TEXT, DISCLAIMER, WELCOME } from "@/kb/copy";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
        <Suspense>
          <Welcome copy={WELCOME} consentText={CONSENT_TEXT} disclaimer={DISCLAIMER} />
        </Suspense>
      </main>
    </>
  );
}
