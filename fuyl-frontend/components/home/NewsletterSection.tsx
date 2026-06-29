"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/api/content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await subscribeNewsletter(email);
      setStatus("success");
      setEmail("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <section className="py-20  text-brand-forest">
      <div className="container-brand max-w-2xl mx-auto text-center">
        <ScrollReveal>
          {/* <p className="text-label mb-3 text-white/70">Stay in the loop</p> */}
          <h2 className="text-display-xl font-display mb-4">
            STAY INFORMED ON YOUR HEALTH
          </h2>
          <p className="text-body-md mb-8 text-brand-olive-light max-w-4xl mx-auto">
            Ingredient science, formulation insights, and early access to new
            products. Straight to your inbox. One useful email per week. No spam
          </p>

          {status === "success" ? (
            <div className="py-4">
              <p className="text-display-md font-display">YOU'RE IN! 🎉</p>
              <p className="text-body-md mt-2 text-brand-olive-light">
                Welcome to the FUYL community. Check your inbox.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                }}
                placeholder="your@email.com"
                required
                className="flex-1 h-12 px-4 text-body-sm rounded-sm outline-none bg-white/15 border border-brand-berry-light text-brand-muted placeholder:text-brand-muted focus:border-brand-teal transition-colors"
              />
              {/* Forest Green subscribe button — strong secondary action */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-12 px-7 text-xs font-semibold uppercase tracking-widest rounded-sm bg-brand-forest text-white transition-colors shrink-0 hover:bg-brand-olive disabled:opacity-60"
              >
                {status === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-body-xs text-red-300">{errorMsg}</p>
          )}

          <p className="mt-4 text-body-xs text-brand-berry-light">
            No spam, ever. Unsubscribe anytime.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
