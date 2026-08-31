"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { ANNOUNCEMENT, ANNOUNCEMENT_LINK } from "@/lib/constants/site";
import type { AnnouncementBarCMS } from "@/lib/api/content";

const DISMISS_KEY = "fuyl_announcement_dismissed";

interface Props {
  cms?: AnnouncementBarCMS | null;
}

export function AnnouncementBar({ cms }: Props) {
  const text = cms?.text ?? ANNOUNCEMENT;
  const linkHref = cms?.linkHref ?? ANNOUNCEMENT_LINK;
  const dismissible = cms?.dismissible ?? true;

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissible && localStorage.getItem(DISMISS_KEY) === text) {
      startTransition(() => setDismissed(true));
    }
  }, [text, dismissible]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, text);
    setDismissed(true);
  };

  if (cms?.isActive === false || dismissed) return null;

  return (
    <div className="relative bg-brand-forest text-white text-center py-2.5 px-12 sm:px-10">
      <Link
        href={linkHref}
        className="text-body-xs font-semibold tracking-widest uppercase hover:text-brand-sage transition-colors inline-block leading-snug"
      >
        {text}
        <span className="ml-1 inline-flex align-middle" aria-hidden="true">
          <ArrowRight size={14} />
        </span>
      </Link>
      {dismissible && (
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 hover:opacity-70 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
