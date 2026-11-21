import type { Metadata } from "next";
import { Suspense } from "react";
import { Player } from "@/components/flow/Player";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const metadata: Metadata = { title: "Your assessment", robots: { index: false } };

export default function QuestionPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col px-4 py-8 sm:py-14">
        <Suspense>
          <Player />
        </Suspense>
      </main>
    </>
  );
}
