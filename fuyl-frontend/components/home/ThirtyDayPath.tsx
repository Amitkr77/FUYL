"use client";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

const WEEKS = [
  {
    period: "Week 1",
    title: "Your Gut Wakes Up",
    body: "The probiotics and digestive enzymes start rebalancing your microbiome. Less bloating. Better digestion. You may notice a subtle lift in energy.",
    colour: "#EEF4E4" /* light sage-cream */,
    accent: "#558476" /* Muted Teal */,
    image: "/images/journey/frist-week.webp",
  },
  {
    period: "Week 2",
    title: "Stress Starts to Ease",
    body: "Ashwagandha builds up in your system. Cortisol levels begin to drop. You sleep a little deeper. Your mood stabilises. Focus sharpens.",
    colour: "#E8EDD8" /* soft sage */,
    accent: "#3A4A2E" /* Olive Moss */,
    image: "/images/journey/second-week.webp",
  },
  {
    period: "Weeks 3–4",
    title: "Energy & Immunity Surge",
    body: "Spirulina and Vitamin D3 are now working at full capacity. You feel noticeably more energetic. Your immune response gets stronger. Skin starts to glow.",
    colour: "#DDE8C8" /* Soft Sage Green */,
    accent: "#3D6459" /* Teal Dark */,
    image: "/images/journey/third-week.webp",
  },
  {
    period: "Day 30+",
    title: "The New You",
    body: "A full month of consistent nourishment. Liver is cleaner, joints feel better, mental clarity is at a new baseline. This is your new normal.",
    colour: "#DCE8E4" /* sage-teal */,
    accent: "#12291F" /* Deep Forest Green */,
    image: "/images/journey/fourth-week.webp",
  },
];

export function ThirtyDayPath() {
  const [active, setActive] = useState(0);
  return (
    <section className="section-py bg-brand-cream">
      <div className="container-brand">
        <ScrollReveal>
          <p className="text-label text-center mb-3 text-brand-teal">
            THE 30-DAY PATH
          </p>
          <h2 className="text-display-xl font-display text-center mb-4 text-brand-forest max-w-4xl mx-auto">
            WHAT 30 DAYS OF COMPLETE+ ACTUALLY LOOKS LIKE
          </h2>
          <p className="text-body-lg text-center max-w-xl mx-auto mb-16 text-brand-muted">
            Nutrition works through consistency, not through single doses. Here
            is what to expect.
          </p>
        </ScrollReveal>

        {/* Desktop — horizontal expanding cards */}
        <div className="hidden lg:flex gap-3 h-[520px]">
          {WEEKS.map((week, i) => (
            <div
              key={week.period}
              onMouseEnter={() => setActive(i)}
              className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-in-out flex-shrink-0"
              style={{
                flexBasis: active === i ? "50%" : "16.66%",
                background: week.colour,
              }}
            >
              {/* Background image — visible when active */}
              <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: active === i ? 1 : 0 }}
              >
                <Image
                  src={week.image}
                  alt={week.title}
                  fill
                  className="object-cover object-center"
                  sizes="50vw"
                />
                {/* Gradient over image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>

              {/* Collapsed state — vertical label */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 px-3"
                style={{ opacity: active === i ? 0 : 1 }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: week.accent }}
                >
                  {i + 1}
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest writing-mode-vertical text-center"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    color: week.accent,
                  }}
                >
                  {week.period}
                </p>
              </div>

              {/* Expanded state — full content */}
              <div
                className="absolute inset-0 flex flex-col justify-end p-8 transition-opacity duration-300"
                style={{ opacity: active === i ? 1 : 0 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-2">
                  {week.period}
                </p>
                <h3 className="font-display text-2xl font-bold text-white mb-3 leading-tight">
                  {week.title}
                </h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-xs">
                  {week.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile — vertical stacked cards with image on top */}
        <div className="flex flex-col gap-4 lg:hidden">
          {WEEKS.map((week, i) => (
            <ScrollReveal key={week.period} delay={i * 80}>
              <div
                className="rounded-xl overflow-hidden border border-brand-border"
                style={{ background: week.colour }}
              >
                {/* Image */}
                <div className="relative w-full h-52">
                  <Image
                    src={week.image}
                    alt={week.title}
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div
                    className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: week.accent }}
                  >
                    {i + 1}
                  </div>
                </div>
                {/* Text */}
                <div className="p-5">
                  <p className="text-label mb-1" style={{ color: week.accent }}>
                    {week.period}
                  </p>
                  <p className="text-body-md font-semibold mb-2 text-brand-forest">
                    {week.title}
                  </p>
                  <p className="text-body-sm leading-relaxed text-brand-muted">
                    {week.body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal delay={400}>
          <div className="mt-12 text-center">
            <p className="text-display-sm font-display text-brand-teal">
              Most people feel the shift by week 3. By day 30, they do not think
              about it anymore. Because it has become their morning.
            </p>

            <Link
              href="/pages/why-fuyl"
              className="mt-10 inline-flex h-11 items-center justify-center rounded-sm border bg-brand-forest px-8 text-xs font-semibold uppercase tracking-widest text-white! transition-colors hover:text-brand-forest! hover:bg-brand-sage hover:border-none"
            >
              START YOUR 30 DAYS - SHOP FUYL COMPLETE+ →
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
