"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { ANNOUNCEMENT, ANNOUNCEMENT_LINK } from "@/lib/constants/site";

const DISMISS_KEY = "fuyl_announcement_dismissed";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  // Persist dismissal so it doesn't reappear on every navigation/reload. Keyed
  // to the announcement text, so changing the copy re-shows the bar.
  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === ANNOUNCEMENT) startTransition(() => setDismissed(true));
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, ANNOUNCEMENT);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-brand-forest text-white text-center py-2.5 px-12 sm:px-10">
      <Link
        href={ANNOUNCEMENT_LINK}
        className="text-body-xs font-semibold tracking-widest uppercase hover:text-brand-sage transition-colors inline-block leading-snug"
      >
        {ANNOUNCEMENT}
        <span className="ml-1 inline-flex align-middle" aria-hidden="true">
          <ArrowRight size={14} />
        </span>
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 hover:opacity-70 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}
