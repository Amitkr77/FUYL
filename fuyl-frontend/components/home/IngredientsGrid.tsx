import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const INGREDIENTS = [
  {
    name: "Real Berry Blend",
    sub: "2,600mg of nature's most potent antioxidants",
    emoji: "🫐",
  },
  {
    name: "Sunfiber® PHGG",
    sub: "Gut health without the bloat · Clinically validated prebiotic",
    emoji: "🌾",
  },
  {
    name: "KSM-66® Ashwagandha",
    sub: "Stress resilience · Sustained energy · Mental clarity",
    emoji: "🌿",
  },
  {
    name: "Milk Thistle Extract",
    sub: "Liver protection · The organ most supplements ignore",
    emoji: "🌸",
  },
  {
    name: "Astaxanthin",
    sub: "Nature's most powerful antioxidant · Cellular protection",
    emoji: "🦐",
  },
  {
    name: "Amla Extract",
    sub: "Ancient Indian superfood · Immune support · Cellular repair",
    emoji: "🍃",
  },
  {
    name: "Vitamin D3 + K2",
    sub: "India's one of most widespread deficiency · Addressed daily",
    emoji: "☀️",
  },
  {
    name: "Bacillus Coagulans",
    sub: "Heat-stable probiotic · Survives to reach your gut",
    emoji: "🦠",
  },
  {
    name: "Monkfruit",
    sub: "150–300x sweeter than sugar with ZERO Calories",
    emoji: "🍈",
  },
];

export function IngredientsGrid() {
  return (
    <section className="section-py bg-white overflow-hidden">
      <div className="container-brand">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — label, heading, list, CTA */}
          <div className="flex flex-col">
            <ScrollReveal>
              <span className="text-label font-semibold uppercase tracking-widest text-brand-teal ">
                Ingredients
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-forest leading-tight mb-4">
                WHAT IS INSIDE & 
                <br />
                WHY EVERY CHOICE MATTERS
              </h2>
              <p className="text-body-sm text-brand-muted mb-8 max-w-md leading-relaxed">
                Rooted in{" "}
                <span className="text-brand-rose">
                  Indian botanical tradition
                </span>
                . Validated by{" "}
                <span className="text-brand-rose">global clinical science</span>
                . Every ingredient here for a reason. Every choice made with
                your <span className="text-brand-rose">long term health</span>{" "}
                in mind.
              </p>
            </ScrollReveal>

            {/* Ingredient list */}
            <div className="flex flex-col divide-y gap-2 divide-brand-border">
              {INGREDIENTS.map(({ name, sub, emoji }, i) => (
                <ScrollReveal key={name} delay={i * 40}>
                  <div className="flex items-center gap-6 py-3.5">
                    <span className="text-2xl w-8 shrink-0">{emoji}</span>
                    <div>
                      <p className="text-body-sm font-semibold text-brand-forest">
                        {name}
                      </p>
                      <p className="text-[11px] mt-0.5 text-brand-teal leading-snug">
                        {sub}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* CTA */}
            <ScrollReveal delay={400}>
              <div className="mt-8">
                <Link
                  href="/products/fuyl-complete"
                  className="inline-flex items-center justify-center w-full sm:w-auto h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white! rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest!"
                >
                  Get Started
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — tall image with rounded corners */}
          <ScrollReveal className="w-full">
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ aspectRatio: "9/16" }}
            >
              <Image
                src="/images/ingredients-hero.webp"
                alt="Woman holding FUYL COMPLETE+"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
