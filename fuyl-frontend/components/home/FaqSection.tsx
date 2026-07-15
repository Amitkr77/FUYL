"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const FAQS = [
  {
    id: "01",
    question: "What exactly is FUYL COMPLETE+?",
    answer:
      "FUYL COMPLETE+ is a daily nutrition powder containing 60+ premium ingredients — including probiotics, adaptogens, vitamins, minerals, antioxidants, digestive enzymes and omega fatty acids — all in one 10g sachet. Mix it with water or a smoothie every morning.",
  },
  {
    id: "02",
    question: "How soon will I see results?",
    answer:
      "Most people notice improved digestion and energy within the first 7–10 days. Stress resilience and deeper sleep usually improve in week 2. By day 30, many customers report noticeable improvements across energy, gut health, immunity and mood.",
  },
  {
    id: "03",
    question: "Is it safe to take every day?",
    answer:
      "Yes. All ingredients are used at evidence-based daily doses. FUYL COMPLETE+ is manufactured in an FSSAI-certified facility and contains no artificial colours, harmful stimulants or banned substances.",
  },
  {
    id: "04",
    question: "Can I take it with other supplements?",
    answer:
      "In most cases yes. FUYL COMPLETE+ is designed to cover your daily nutrition foundation. If you take prescription medication or therapeutic doses of nutrients, consult your doctor first.",
  },
  {
    id: "05",
    question: "What does it taste like?",
    answer:
      "A refreshing Mixed Berry flavour — light, smooth and not overly sweet. It blends easily with cold water, smoothies, coconut water or juice.",
  },
  {
    id: "06",
    question: "What is your refund policy?",
    answer:
      "We offer a 30-day money-back guarantee. If you do not feel a meaningful difference after consistent use, contact us and we will issue a full refund.",
  },
];

const TRUST = [
  { label: "FSSAI Certified" },
  { label: "30-Day Guarantee" },
  { label: "No Artificial Colours" },
  { label: "60+ Ingredients" },
];

export function FaqSection() {
  const [open, setOpen] = useState("01");

  return (
    <section className="bg-brand-cream py-24 lg:py-32 overflow-hidden">
      <div className="container-brand">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14 items-stretch">
          {/* ── LEFT — label, heading, image, CTA ── */}
          <ScrollReveal className="lg:sticky lg:top-24">
            <div className="flex flex-col">
              {/* Label */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full   bg-brand-sage px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
                <span className="text-[10px] text-label  text-brand-muted">
                  Any doubt?
                </span>
              </div>

              {/* Heading */}
              <h2 className="text-display-xl font-display text-brand-forest mt-6 sm:mt-8">
                YOUR QUESTIONS ANSWERED SIMPLY
              </h2>

              {/* <p className="mt-5 max-w-md text-[15px] leading-relaxed text-brand-muted">
                Everything you need to know about ingredients, results, safety
                and starting your FUYL journey.
              </p> */}

              {/* Trust */}
              {/* <div className="mt-6 flex flex-wrap gap-2">
                {TRUST.map(({ label }) => (
                  <span
                    key={label}
                    className="rounded-full border border-brand-border bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted"
                  >
                    {label}
                  </span>
                ))}
              </div> */}

              {/* Image */}
              <div className="group relative mt-8 h-64 sm:h-80 lg:h-96 overflow-hidden rounded-3xl">
                <Image
                  src="/images/ingredients-hero.webp"
                  alt="FUYL ingredients"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>

              {/* CTA */}
              <Link
                href="/pages/contact"
                className="group/link mt-6 flex items-center justify-between rounded-2xl border border-brand-border bg-brand-forest text-brand-sage px-5 py-3.5 transition-all hover:border-brand-teal hover:bg-brand-sage hover:text-brand-forest sm:px-6 sm:py-4"
              >
                <span className="text-sm font-medium ">
                  Still have questions?
                </span>

                <span className="flex items-center gap-1.5 text-sm font-semibold transition-all group-hover/link:gap-2.5">
                  Contact us →
                </span>
              </Link>
            </div>
          </ScrollReveal>

          {/* ── RIGHT — accordion ── */}
          <ScrollReveal delay={120}>
            <div className="h-full flex flex-col">
              <div className="flex-1 divide-y divide-brand-border/40 flex flex-col justify-around h-full">
                {FAQS.map((item) => {
                  const active = open === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`transition-colors duration-200 ${active ? "bg-brand-sage/20 -mx-5 p-5 rounded-xl" : ""}`}
                    >
                      <button
                        onClick={() => setOpen(active ? "" : item.id)}
                        className="flex w-full items-center justify-between gap-8 py-6! text-left group/btn"
                      >
                        <div className="flex items-center gap-5">
                          {/* Number */}
                          <span
                            className={`text-[11px] font-bold tabular-nums tracking-widest w-6 shrink-0 transition-colors duration-200 ${active ? "text-brand-teal" : "text-brand-border"}`}
                          >
                            {item.id}
                          </span>
                          {/* Question */}
                          <h3
                            className={`text-[16px] font-semibold leading-snug transition-colors duration-200 ${active ? "text-brand-forest" : "text-brand-dark group-hover/btn:text-brand-forest"}`}
                          >
                            {item.question}
                          </h3>
                        </div>

                        {/* Toggle */}
                        <span
                          className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition-all duration-300
            ${
              active
                ? "rotate-45 bg-brand-teal text-white"
                : "border border-brand-border/60 text-brand-muted group-hover/btn:border-brand-teal group-hover/btn:text-brand-teal"
            }
          `}
                        >
                          +
                        </span>
                      </button>

                      {/* Answer */}
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden">
                          <p className="pl-11 pb-7 text-[14.5px] leading-[1.8] text-brand-muted max-w-lg">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom CTA */}
              {/* <div className="mt-auto rounded-2xl bg-brand-forest p-5 sm:p-7 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-5 text-center sm:text-left">
                <div>
                  <p className="font-display text-lg font-bold text-white leading-tight">
                    Ready to start your
                    <br className="hidden sm:block" /> 30-day journey?
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Join thousands who've made FUYL their morning ritual.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link
                    href="/products/fuyl-complete"
                    className="inline-flex items-center justify-center h-10 px-6 text-[11px] font-semibold uppercase tracking-widest border border-brand-sage bg-brand-forest text-white hover:text-brand-forest rounded-lg transition-colors hover:bg-brand-sage whitespace-nowrap"
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/pages/why-fuyl"
                    className="inline-flex items-center justify-center h-10 px-6 text-[11px] font-semibold uppercase tracking-widest border border-white/15 text-white/60 rounded-lg transition-colors hover:border-brand-teal hover:text-white whitespace-nowrap"
                  >
                    Learn More
                  </Link>
                </div>
              </div> */}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
