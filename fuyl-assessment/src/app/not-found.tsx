import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="glass-strong w-full max-w-md rounded-[var(--radius-glass)] p-10 text-center">
          <h1 className="font-display text-4xl text-forest">We couldn&rsquo;t find that</h1>
          <p className="mt-3 text-[15px] text-muted">This link may have expired. Reports are kept for 12 months.</p>
          <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-forest px-7 text-sm font-medium text-white">
            Take the assessment
          </Link>
        </div>
      </main>
    </>
  );
}
