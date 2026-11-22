"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, Check, Link2, Printer } from "lucide-react";

/** "Save as PDF" (browser print → Save as PDF) and "Copy link" for the report. */
export function ResultActions() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers / insecure contexts: fall back to a temporary input.
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-forest hover:bg-white/80">
        <Printer className="h-4 w-4 text-teal-deep" aria-hidden /> Save as PDF
      </button>
      <button type="button" onClick={copy} className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-forest hover:bg-white/80">
        {copied ? <Check className="h-4 w-4 text-teal-deep" aria-hidden /> : <Link2 className="h-4 w-4 text-teal-deep" aria-hidden />}
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}

/**
 * Mobile-only bar with the product CTA. Appears once the reader has scrolled
 * past the hero, and hides while the full product card is on screen.
 */
export function StickyCta({ href, priceFrom }: { href: string; priceFrom: number }) {
  const [scrolled, setScrolled] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const card = document.getElementById("product-card");
    const io = card ? new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { threshold: 0.15 }) : null;
    if (card && io) io.observe(card);
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const show = scrolled && !cardVisible;
  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="glass-strong !bg-white/95 fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 md:hidden print:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <span className="text-sm text-forest">
            <span className="block text-xs text-muted">FUYL COMPLETE+</span>
            From <strong>₹{priceFrom.toLocaleString("en-IN")}</strong>
          </span>
          <a href={href} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-forest px-5 text-sm font-medium text-white">
            View <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </m.div>
      )}
    </AnimatePresence>
  );
}
