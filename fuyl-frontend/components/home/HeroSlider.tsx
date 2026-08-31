"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { StorefrontHeroSlide } from "@/lib/api/content";

// ─── Static fallback slides ──────────────────────────────────────────────────
const FALLBACK_SLIDES = [
  {
    id: "1",
    mediaType: "image" as const,
    eyebrow: "Introducing FUYL COMPLETE+",
    headline: ["Nourish Daily.", "Feel Stronger.", "Live longer."],
    sub: "A Daily Nutrition Powder.",
    cta: { label: "SHOP FUYL COMPLETE +", href: "/products/fuyl-complete" },
    image: "/images/hero-slide-1.webp",
    imageAlt: "FUYL Complete daily nutrition",
    video: "",
  },
  {
    id: "2",
    mediaType: "image" as const,
    eyebrow: "30-Day Transformation",
    headline: ["One Sachet", "Every Morning", "Everything covered."],
    sub: "Built For Daily Life And Long Term Health.",
    cta: { label: "START TODAY", href: "/products/fuyl-complete" },
    image: "/images/hero-slide-2.webp",
    imageAlt: "FUYL daily sachet",
    video: "",
  },
];

type Slide = {
  id: string;
  mediaType: "image" | "video";
  eyebrow: string;
  headline: string[];
  sub: string;
  cta: { label: string; href: string };
  ctaAlt?: { label: string; href: string };
  image: string;
  imageAlt: string;
  video: string;
};

function mapSlide(s: StorefrontHeroSlide): Slide {
  return {
    id: s.id,
    mediaType: s.mediaType ?? "image",
    eyebrow: s.eyebrow,
    headline: s.headline.split("\n").filter(Boolean),
    sub: s.subheading,
    cta: { label: s.primaryCtaLabel, href: s.primaryCtaHref },
    ctaAlt:
      s.secondaryCtaLabel && s.secondaryCtaHref
        ? { label: s.secondaryCtaLabel, href: s.secondaryCtaHref }
        : undefined,
    image: s.image,
    imageAlt: s.imageAlt,
    video: s.video ?? "",
  };
}

const DURATION = 5000;

export function HeroSlider({
  slides: managedSlides,
  autoplayMs,
}: {
  slides?: StorefrontHeroSlide[];
  autoplayMs?: number;
}) {
  // Filter inactive slides before mapping
  const slides: Slide[] = managedSlides?.length
    ? managedSlides.filter((s) => s.isActive !== false).map(mapSlide)
    : FALLBACK_SLIDES;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const duration = autoplayMs ?? DURATION;

  const goTo = useCallback(
    (index: number) => {
      // Pause the old video, play the new one
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (i === index) {
          v.currentTime = 0;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
      setCurrent(index);
    },
    [],
  );

  const next = useCallback(
    () => goTo((current + 1) % slides.length),
    [current, slides.length, goTo],
  );

  // Auto-advance (skip for video slides — video drives its own timing)
  useEffect(() => {
    if (paused) return;
    const slide = slides[current];
    if (slide?.mediaType === "video") return; // video auto-advances via onEnded
    const id = setInterval(next, duration);
    return () => clearInterval(id);
  }, [paused, next, duration, current, slides]);

  // Sync video playback when slide changes
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [current]);

  const slide = slides[current] ?? slides[0];
  if (!slide) return null;

  return (
    <section
      className="relative w-full max-w-full overflow-hidden h-[70dvh] min-h-115 sm:h-dvh sm:min-h-140"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Hero"
    >
      {/* ── Backgrounds ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === current ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          >
            {s.mediaType === "video" && s.video ? (
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={s.video}
                poster={s.image || undefined}
                autoPlay={i === 0}
                muted
                loop={false}
                playsInline
                onEnded={() => next()}
                className="h-full w-full object-cover select-none pointer-events-none"
              />
            ) : (
              <Image
                src={s.image}
                alt={s.imageAlt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover object-center select-none pointer-events-none"
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Gradient overlay ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/65"
        aria-hidden="true"
      />

      {/* ── Text content ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col justify-end overflow-hidden">
        <div className="w-full max-w-full px-4 pb-20 sm:px-10 sm:pb-32 md:px-16 md:pb-28 lg:px-24 xl:px-32">
          <div className="max-w-5xl text-center sm:text-left">
            <p
              key={`eyebrow-${slide.id}`}
              className="mb-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/75 animate-fadeIn"
            >
              {slide.eyebrow}
            </p>

            <h1
              key={`headline-${slide.id}`}
              className="font-display text-[clamp(1.75rem,8vw,3.5rem)] font-bold text-white leading-[1.1] mb-3 sm:mb-4 animate-fadeIn wrap-break-word uppercase"
            >
              {slide.headline.map((line, idx) => (
                <span key={idx} className="block">{line}</span>
              ))}
            </h1>

            <p
              key={`sub-${slide.id}`}
              className="mb-5 sm:mb-7 text-sm sm:text-base text-white/80 max-w-full sm:max-w-md leading-relaxed animate-fadeIn mx-auto sm:mx-0"
            >
              {slide.sub}
            </p>

            <div className="flex flex-wrap gap-3 max-w-full justify-center sm:justify-start">
              <Link
                href={slide.cta.href}
                className="inline-flex items-center justify-center h-9 sm:h-12 px-4 sm:px-8 text-[9px] sm:text-[11px] font-semibold uppercase tracking-widest bg-white text-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white whitespace-nowrap"
              >
                {slide.cta.label}
              </Link>
              {slide.ctaAlt && (
                <Link
                  href={slide.ctaAlt.href}
                  className="inline-flex items-center justify-center h-9 sm:h-12 px-4 sm:px-8 text-[9px] sm:text-[11px] font-semibold uppercase tracking-widest border border-white/60 text-white rounded-sm hover:bg-brand-forest transition-colors"
                >
                  {slide.ctaAlt.label}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Slide dots ─────────────────────────────────────────────────── */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-black/20 backdrop-blur-md px-3 py-2 sm:px-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
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
        )}
      </div>

      <style>{`
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
