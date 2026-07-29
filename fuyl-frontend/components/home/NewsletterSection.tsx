"use client";

import { useState } from "react";
import {
  subscribeNewsletter,
  type NewsletterSubscribeStatus,
} from "@/lib/api/content";
import { getErrorMessage } from "@/lib/api/client";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

// Copy shown after a successful submit, keyed by the lifecycle state the
// backend reports (double opt-in — most paths ask the visitor to confirm).
const SUCCESS_COPY: Record<
  NewsletterSubscribeStatus,
  { heading: string; body: string }
> = {
  pending: {
    heading: "ALMOST THERE! 📬",
    body: "Check your inbox and click the link to confirm your subscription.",
  },
  reactivating: {
    heading: "WELCOME BACK! 📬",
    body: "Check your inbox and click the link to confirm your subscription.",
  },
  already_subscribed: {
    heading: "YOU'RE ALREADY IN! 🎉",
    body: "This email is already on our list — nothing more to do.",
  },
};

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [result, setResult] = useState<NewsletterSubscribeStatus>("pending");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await subscribeNewsletter(email, "homepage_footer");
      setResult(res.status);
      setStatus("success");
      setEmail("");
    } catch (err: unknown) {
      setErrorMsg(
        getErrorMessage(err, "Something went wrong. Please try again."),
      );
      setStatus("error");
    }
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 text-brand-forest bg-neutral-100">
      <div className="container-brand max-w-2xl mx-auto text-center">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label">
              Stay in the loop
            </span>
          </div>
          <h2 className="text-display-xl font-display mb-4">
            STAY INFORMED ON YOUR HEALTH
          </h2>
          <p className="text-body-md mb-8 text-brand-olive-light max-w-4xl mx-auto">
            Ingredient science, formulation insights, and early access to new
            products. Straight to your inbox — one useful email per week.
          </p>

          {status === "success" ? (
            <div className="py-4">
              <p className="text-display-md font-display">
                {SUCCESS_COPY[result].heading}
              </p>
              <p className="text-body-md mt-2 text-brand-olive-light">
                {SUCCESS_COPY[result].body}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                }}
                placeholder="your@email.com"
                required
                className="flex-1 h-12 px-4 py-4 text-body-sm rounded-sm outline-none bg-white border border-brand-border text-brand-forest placeholder:text-brand-muted focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30 transition-colors"
              />
              {/* Forest Green subscribe button — strong secondary action */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-12 px-7 text-xs font-semibold uppercase tracking-widest rounded-sm bg-brand-forest text-white transition-colors shrink-0 hover:bg-brand-sage hover:text-brand-forest disabled:opacity-60"
              >
                {status === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p role="alert" className="mt-3 text-body-xs text-red-600">{errorMsg}</p>
          )}

          <p className="mt-4 text-body-xs text-brand-berry-light">
            No spam, ever. Unsubscribe anytime.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
