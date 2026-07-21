"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const FAQS = [
  {
    id: "01",
    question: "What is FUYL COMPLETE+ and who is it for?",
    answer:
      "FUYL COMPLETE+ is a daily nutrition powder with 60+ premium ingredients covering gut health, energy support, immunity support, antioxidants, liver support, skin & cellular health support, adaptogens, omega support, vitamins, and minerals - all in one 10g sachet. It is for health-conscious urban Indians who want one trusted nutritional foundation they can rely on every morning without complexity or compromise.",
  },
  {
    id: "02",
    question: "How does it taste and what does it look like?",
    answer:
      "Natural mixed berry flavour from 2,600mg of real berry powder: blueberry, tart cherry, acai berry, strawberry, and raspberry. When mixed with 200ml cold water it produces a light, refreshing deep berry red drink. The colour is entirely from the fruit powder. No artificial colouring agents. No chalky texture. No medicinal smell.",
  },
  {
    id: "03",
    question: "How is this different from a regular multivitamin?",
    answer:
      "A multivitamin covers vitamins and minerals. COMPLETE+ covers vitamins and minerals plus 11 functional blends including berry antioxidants, phytonutrients, prebiotic fiber, adaptogens, liver support, digestive enzymes, probiotics. It also uses active bioavailable forms - chelated bisglycinate over oxides and sulfates that most multivitamins do not. The ingredients are documented publicly on our WHY FUYL page.",
  },
  {
    id: "04",
    question: "Is it suitable for vegetarians?",
    answer:
      "Yes. FUYL Complete+ is 100% vegetarian. Every ingredient is plant-sourced or produced through fermentation. This is certified on the product label.",
  },
  {
    id: "05",
    question: "can i have more than 1 sachet in a day?",
    answer:
      "It is recommended to not consume more than 1 sachet a day. One sachet has some nutrients that meet your RDA (Recommended Dietary Allowance). Having more than 1 sachet a day exceeds this allowance. ",
  },
  {
    id: "06",
    question: "when will i start noticing a difference?",
    answer:
      "Most people notice changes in gut comfort and energy by week 2. The adaptogen stack from KSM-66 reaches meaningful cortisol modulation at approximately 10-14 days. The full foundation builds over 30 days of consistent daily use. Nutrition is not an event. It is a practice.",
  },
  {
    id: "07",
    question: "what is KSM-66 and why does it matter?",
    answer:
      "KSM-66 is a specific branded ashwagandha root extract by Ixoreal Biomed with 22+ gold-standard clinical trials. Generic ashwagandha may be root, leaf, or a mix with no specified extraction process. KSM-66 is full-spectrum root with defined with anolide content and documented clinical evidence. The difference in quality is meaningful and verifiable.",
  },
  {
    id: "08",
    question: "Can i take it with existing medicines?",
    answer:
      "If you are on prescription medication or have a diagnosed medical condition, consult your doctor before starting any new supplement. Complete+ is a food supplement, not a medicine, but some ingredients including KSM-66 may interact with thyroid medications at therapeutic doses.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState("01");

  return (
    <section id="faq" className="bg-brand-cream py-24 lg:py-32 overflow-hidden scroll-mt-24">
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
                  src="/images/FAQ.png"
                  alt="FUYL ingredients"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>

              {/* CTA */}
              <Link
                href="/pages/contact"
                className="group/link mt-6 flex items-center justify-between rounded-2xl  bg-brand-forest text-brand-sage px-5 py-3.5 transition-all hover:border-brand-teal hover:bg-brand-sage hover:text-brand-forest sm:px-6 sm:py-4"
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

          {/* ── RIGHT — accordion ──
              On desktop the accordion is absolutely positioned inside its
              (stretched) grid cell, so it never inflates the row — the row
              height is driven entirely by the LEFT column. The list fills that
              exact height and scrolls internally when an open answer would
              otherwise overflow, keeping both columns matched. */}
          <ScrollReveal delay={120} className="lg:relative">
            <div className="flex flex-col lg:absolute lg:inset-0 lg:overflow-y-auto lg:overflow-x-hidden lg:px-5 scrollbar-none [&::-webkit-scrollbar]:hidden">
              <div className="divide-y divide-brand-border/40">
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
