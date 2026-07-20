"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SLIDES = [
  {
    id: 1,
    eyebrow: "Introducing FUYL COMPLETE+",
    headline: ["Nourish Daily.", "Feel Stronger.", "Live longer."],
    sub: "A Daily Nutrition Powder.",
    cta: { label: "SHOP FUYL COMPLETE +", href: "/products/fuyl-complete" },
    // ctaAlt: { label: "Learn More", href: "/pages/why-fuyl" },
    image: "/images/hero-slide-1.webp",
  },
  {
    id: 2,
    eyebrow: "30-Day Transformation",
    headline: ["One Sachet", "Every Morning", "Everything covered."],
    sub: "Built For Daily Life And Long Term Health.",
    cta: { label: "START TODAY", href: "/products/fuyl-complete" },
    // ctaAlt: { label: "See the Science", href: "/pages/science" },
    image: "/images/hero-slide-2.webp",
  },
];

const DURATION = 5000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setCurrent((i) => (i + 1) % SLIDES.length),
    [],
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, DURATION);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full max-w-full overflow-hidden h-dvh min-h-[500px] sm:min-h-140"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Hero"
    >
      {/* Full-screen background images — one per slide, crossfade via opacity */}
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <Image
            key={s.id}
            src={s.image}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover object-center transition-opacity duration-700 select-none pointer-events-none",
              i === current ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Dark gradient overlay — bottom-heavy so text pops */}
      <div
        className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/60"
        aria-hidden="true"
      />

      {/* Content — bottom-center on mobile, pinned to bottom-left from sm up */}
      <div className="absolute inset-0 flex flex-col justify-end overflow-hidden">
        <div className="w-full max-w-full px-4 pb-28 sm:px-10 sm:pb-32 md:px-16 md:pb-28 lg:px-24 xl:px-32">
          <div className="max-w-5xl text-center sm:text-left">
            {/* Eyebrow */}
            <p
              key={`eyebrow-${slide.id}`}
              className="mb-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/75 animate-fadeIn"
            >
              {slide.eyebrow}
            </p>

            {/* Headline */}
            <h1
              key={`headline-${slide.id}`}
              className="font-display text-[clamp(1.75rem,8vw,3.5rem)] font-bold text-white leading-[1.1] mb-3 sm:mb-4 animate-fadeIn wrap-break-word uppercase"
            >
              {slide.headline.map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
            </h1>

            {/* Sub */}
            <p
              key={`sub-${slide.id}`}
              className="mb-5 sm:mb-7 text-sm sm:text-base text-white/80 max-w-full sm:max-w-md leading-relaxed animate-fadeIn mx-auto sm:mx-0"
            >
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 max-w-full justify-center sm:justify-start">
              <Link
                href={slide.cta.href}
                className="inline-flex items-center justify-center h-11 sm:h-12 px-6 sm:px-8 text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest bg-white text-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white whitespace-nowrap"
              >
                {slide.cta.label}
              </Link>
              {/* <Link
                href={slide.ctaAlt.href}
                className="inline-flex items-center justify-center h-11 sm:h-12 px-6 sm:px-8 text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest border border-white/60 text-white! rounded-sm transition-colors hover:bg-brand-forest hover:border-none whitespace-nowrap"
              >
                {slide.ctaAlt.label}
              </Link> */}
            </div>
          </div>
        </div>

        {/* Slider Navigation */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-black/20 backdrop-blur-md px-3 py-2 sm:px-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
              >
                <span
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === current
                      ? "h-1.5 w-6 bg-brand-forest"
                      : "h-1.5 w-1.5 bg-white/40 group-hover:bg-white/70",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {/* {!paused && (
        <div
          key={`progress-${current}`}
          className="absolute bottom-0 left-0 h-0.5 max-w-full bg-brand-forest z-10"
          style={{
            animation: `progressBar ${DURATION}ms linear forwards`,
          }}
        />
      )} */}

      <style>{`
    @keyframes progressBar {
      from { width: 0% }
      to   { width: 100% }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.5s ease forwards;
    }
  `}</style>
    </section>
  );
}
