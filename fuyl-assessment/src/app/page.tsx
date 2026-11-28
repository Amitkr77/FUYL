import { Suspense } from "react";
import { Welcome } from "@/components/flow/Welcome";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { CONSENT_TEXT, DISCLAIMER, TRUST, WELCOME } from "@/kb/copy";
import { DEFAULT_ASSISTED_SETTINGS } from "@/chat/settings";
import { getAssistedSettings } from "@/lib/assisted";

// Re-checked at most once a minute, so the page stays fast and an admin toggle applies within a minute.
export const revalidate = 60;

async function assistedEnabled() {
  try {
    return (await getAssistedSettings()).enabled;
  } catch {
    // No database at build time (or a blip): use the default instead of hiding the option until the next refresh.
    return DEFAULT_ASSISTED_SETTINGS.enabled;
  }
}

export default async function Home() {
  const assisted = await assistedEnabled();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:py-8">
        <Suspense>
          <Welcome copy={WELCOME} consentText={CONSENT_TEXT} disclaimer={DISCLAIMER} trust={TRUST} assisted={assisted} />
        </Suspense>
      </main>
    </>
  );
}
