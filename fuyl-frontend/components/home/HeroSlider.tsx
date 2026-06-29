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
    sub: "60+ premium ingredients. One sachet. Every morning.",
    cta: { label: "Shop Now", href: "/products/fuyl-complete" },
    ctaAlt: { label: "Learn More", href: "/pages/why-fuyl" },
    image: "/images/hero-slide-1.webp",
  },
  {
    id: 2,
    eyebrow: "30-Day Transformation",
    headline: ["One Sachet", "Every Morning", "Everything covered."],
    sub: "Research-backed nutrition for gut, energy, immunity, liver and stress.",
    cta: { label: "Start Now", href: "/products/fuyl-complete" },
    ctaAlt: { label: "See the Science", href: "/pages/science" },
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
      className="relative w-full overflow-hidden h-dvh min-h-[560px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Hero"
    >
      {/* Full-screen background images — one per slide, crossfade via opacity */}
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

      {/* Dark gradient overlay — bottom-heavy so text pops */}
      <div
        className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/60"
        aria-hidden="true"
      />

      {/* Content — pinned to bottom-left on all screen sizes */}
      <div className="absolute inset-0 flex flex-col justify-end">
        <div className="w-full px-5 pb-16 sm:px-10 sm:pb-24 md:px-16 lg:px-24 xl:px-32 max-w-5xl">
          {/* Eyebrow */}
          <p
            key={`eyebrow-${slide.id}`}
            className="mb-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/75 animate-fadeIn"
          >
            {slide.eyebrow}
          </p>

          {/* Headline */}
          <h1
            key={`headline-${slide.id}`}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4 animate-fadeIn"
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
            className="mb-7 text-sm sm:text-base text-white/80 max-w-md leading-relaxed animate-fadeIn"
          >
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={slide.cta.href}
              className="inline-flex items-center justify-center h-11 sm:h-12 px-7 sm:px-8 text-[11px] font-semibold uppercase tracking-widest bg-brand-rose text-white rounded-sm transition-colors hover:bg-brand-rose-dark"
            >
              {slide.cta.label}
            </Link>
            <Link
              href={slide.ctaAlt.href}
              className="inline-flex items-center justify-center h-11 sm:h-12 px-7 sm:px-8 text-[11px] font-semibold uppercase tracking-widest border border-white/60 text-white rounded-sm transition-colors hover:bg-white/15 hover:border-white"
            >
              {slide.ctaAlt.label}
            </Link>
          </div>
        </div>

        {/* Slider Navigation */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 rounded-full bg-black/20 backdrop-blur-md px-4 py-2 border border-white/10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "group relative flex h-3 w-3 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === current && "w-8",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-0 rounded-full transition-all duration-300",
                    i === current
                      ? "bg-white"
                      : "bg-white/40 group-hover:bg-white/70",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!paused && (
        <div
          key={`progress-${current}`}
          className="absolute bottom-0 left-0 h-0.5 bg-brand-rose"
          style={{
            animation: `progressBar ${DURATION}ms linear forwards`,
          }}
        />
      )}

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
