"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile — the "are you human" check — rendered only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. "interaction-only" keeps it invisible
 * for almost everyone; Cloudflare shows a one-click box only when unsure.
 * Each token is single-use, so call reset() after a failed request.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function useHumanCheck(action: "start" | "unlock") {
  const [token, setToken] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          action,
          appearance: "interaction-only",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => {
        /* The server lets requests through if Cloudflare is unreachable. */
      });
    return () => {
      cancelled = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [action]);

  const reset = () => {
    setToken(null);
    if (id.current && window.turnstile) window.turnstile.reset(id.current);
  };

  return {
    /** True when there's nothing to wait for (check off, or passed). */
    ready: !SITE_KEY || Boolean(token),
    token,
    reset,
    widget: SITE_KEY ? <div ref={ref} className="flex min-h-0 justify-center" /> : null,
  };
}

/** Hidden field real people never see or fill; bots that fill every input reveal themselves. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Company
        <input type="text" name="company" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
