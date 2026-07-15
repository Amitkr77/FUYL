"use client";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import Link from "next/link";
import Image from "next/image";

const WEEKS = [
  {
    period: "Week 1",
    title: "The Adjustment",
    body: "Your digestive system begins adapting to the prebiotic fiber. You may notice mild changes. Your gut microbiome is shifting its composition.",
    colour: "#EEF4E4" /* light sage-cream */,
    accent: "#558476" /* Muted Teal */,
    image: "/images/journey/frist-week.webp",
  },
  {
    period: "Week 2",
    title: "The Shift",
    body: "Energy patterns begin to stabilise. Gut comfort improves for most people. KSM-66 begins building measurable cortisol modulation after approximately 10-14 days of consistent use.",
    colour: "#E8EDD8" /* soft sage */,
    accent: "#3A4A2E" /* Olive Moss */,
    image: "/images/journey/second-week.webp",
  },
  {
    period: "Week 3-4",
    title: "The Foundation",
    body: "The adaptogen stack reaches meaningful systemic effect. Stress response, mental clarity, and sustained energy become more consistent. The foundation is set.",
    colour: "#DDE8C8" /* Soft Sage Green */,
    accent: "#3D6459" /* Teal Dark */,
    image: "/images/journey/third-week.webp",
  },
  {
    period: "Day 30+",
    title: "The New Normal",
    body: "Most users stop noticing FUYL COMPLETE+ because feeling good becomes their baseline. This is what compliance looks like when the formulation is built for it.",
    colour: "#DCE8E4" /* sage-teal */,
    accent: "#12291F" /* Deep Forest Green */,
    image: "/images/journey/fourth-week.webp",
  },
];

export function ThirtyDayPath() {
  return (
    <section className="section-py bg-brand-cream">
      <div className="container-brand">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label">
              THE 30-DAY PATH
            </span>
          </div>
          <h2 className="text-display-xl font-display text-center mb-4 text-brand-forest max-w-4xl mx-auto">
            WHAT 30 DAYS OF COMPLETE+ ACTUALLY LOOKS LIKE
          </h2>
          <p className="text-body-lg text-center max-w-xl mx-auto mb-16 text-brand-muted">
            Nutrition works through consistency, not through single doses. Here
            is what to expect.
          </p>
        </ScrollReveal>

        {/* Desktop — equal-width cards */}
        <div className="hidden lg:flex gap-5 items-stretch">
          {WEEKS.map((week, i) => (
            <div
              key={week.period}
              className="flex flex-col flex-1 bg-white rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden"
            >
              {/* Number */}
              <div className="px-6 pt-6 pb-2">
                <span className="text-sm font-medium text-brand-muted/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Image */}
              <div className="relative w-full h-56">
                <Image
                  src={week.image}
                  alt={week.title}
                  fill
                  className="object-cover object-center"
                  sizes="25vw"
                />
              </div>

              {/* Dot indicator */}
              <div className="flex justify-center py-3 border-b border-brand-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-forest/70" />
              </div>

              {/* Text */}
              <div className="flex-1 px-6 pt-4 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted/70 mb-1">
                  {week.period}
                </p>
                <h3 className="font-display text-lg font-bold text-brand-forest mb-2">
                  {week.title}
                </h3>
                <p
                  className="text-sm text-brand-muted leading-relaxed"
                  style={{ textAlign: "justify" }}
                >
                  {week.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile — vertical stacked cards, same visual style */}
        <div className="flex flex-col gap-5 lg:hidden">
          {WEEKS.map((week, i) => (
            <ScrollReveal key={week.period} delay={i * 80}>
              <div className="flex flex-col bg-white rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
                {/* Number */}
                <div className="px-6 pt-6 pb-2">
                  <span className="text-sm font-medium text-brand-muted/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Image */}
                <div className="relative w-full h-52">
                  <Image
                    src={week.image}
                    alt={week.title}
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                  />
                </div>

                {/* Dot indicator */}
                <div className="flex justify-center py-3 border-b border-brand-border/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-forest/70" />
                </div>

                {/* Text */}
                <div className="px-6 pt-4 pb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted/70 mb-1">
                    {week.period}
                  </p>
                  <h3 className="font-display text-lg font-bold text-brand-forest mb-2">
                    {week.title}
                  </h3>
                  <p
                    className="text-sm text-brand-muted leading-relaxed"
                    style={{ textAlign: "justify" }}
                  >
                    {week.body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal delay={400}>
          <div className="mt-12 text-center">
            <p className="text-display-sm font-display text-brand-teal max-w-2xl mx-auto">
              Most people feel the shift by week 3. By day 30, they do not think
              about it anymore. Because it has become their morning.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                href="/products/fuyl-complete"
                className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center rounded-sm border bg-brand-forest px-4 sm:px-8 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-widest text-center text-white! transition-colors hover:bg-brand-sage hover:text-brand-forest! whitespace-normal sm:whitespace-nowrap hover:border-none"
              >
                START YOUR 30 DAYS - SHOP FUYL COMPLETE+ →
              </Link>

              {/*
  <Link
    href="/pages/why-fuyl"
    className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center rounded-sm border border-brand-forest px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-widest text-center text-brand-forest! transition-colors hover:bg-brand-forest hover:text-white! whitespace-normal sm:whitespace-nowrap"
  >
    Why FUYL?
  </Link>
  */}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
