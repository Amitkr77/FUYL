import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const HOME = "/images/ingredient-home";

const INGREDIENTS = [
  {
    name: "Real Berry Blend",
    sub: "2,600mg of nature's most potent antioxidants",
    emoji: "🫐",
    image: `${HOME}/mixed-berry.webp`,
  },
  {
    name: "Sunfiber® PHGG",
    sub: "Gut health without the bloat · Clinically validated prebiotic",
    emoji: "🌾",
    image: `${HOME}/phgg-sunfiber.png`,
  },
  {
    name: "KSM-66® Ashwagandha",
    sub: "Stress resilience · Sustained energy · Mental clarity",
    emoji: "🌿",
    image: `${HOME}/ksm-66-ashwagandha.png`,
  },
  {
    name: "Milk Thistle Extract",
    sub: "Liver protection · The organ most supplements ignore",
    emoji: "🌸",
    image: `${HOME}/milk-thistle.png`,
  },
  {
    name: "Astaxanthin",
    sub: "Nature's most powerful antioxidant · Cellular protection",
    emoji: "🦐",
    image: `${HOME}/astaxanthin.png`,
  },
  {
    name: "Amla Extract",
    sub: "Ancient Indian superfood · Immune support · Cellular repair",
    emoji: "🍃",
    image: `${HOME}/amla.png`,
  },
  {
    name: "Vitamin D3 + K2",
    sub: "India's one of most widespread deficiency · Addressed daily",
    emoji: "☀️",
    image: null,
  },
  {
    name: "Bacillus Coagulans",
    sub: "Heat-stable probiotic · Survives to reach your gut",
    emoji: "🦠",
    image: `${HOME}/bacillus-coagulans.png`,
  },
  {
    name: "Monkfruit",
    sub: "150–300x sweeter than sugar with ZERO Calories",
    emoji: "🍈",
    image: `${HOME}/monkfruit.png`,
  },
];

export function IngredientsGrid() {
  return (
    <section className="section-py bg-white overflow-hidden">
      <div className="container-brand">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-stretch">
          {/* Left — label, heading, list, CTA */}
          <div className="order-2 lg:order-1 flex flex-col">
            <ScrollReveal>
              <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label mb-1">
                Ingredients
              </span>
              <h2 className="text-display-xl font-display text-brand-forest mt-3 mb-4">
                WHAT IS INSIDE & WHY EVERY CHOICE MATTERS
              </h2>
              <p className="text-body-sm text-brand-muted mb-8 max-w-md leading-relaxed">
                Rooted in Indian botanical tradition. Validated by global
                clinical science. Every ingredient here for a reason. Every
                choice made with your long term health in mind.
              </p>
            </ScrollReveal>

            {/* Ingredient list */}
            <div className="flex flex-col divide-y  divide-brand-border">
              {INGREDIENTS.map(({ name, sub, emoji, image }, i) => (
                <ScrollReveal key={name} delay={i * 40}>
                  <div className="flex items-center gap-6 py-3.5">
                    {image ? (
                      <span className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={image}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </span>
                    ) : (
                      <span className="text-3xl w-10 shrink-0 text-center">
                        {emoji}
                      </span>
                    )}
                    <div>
                      <p className="text-body-md font-semibold text-brand-forest">
                        {name}
                      </p>
                      <p className="text-[15px] mt-0.5 text-brand-teal leading-snug">
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
                  className="inline-flex items-center justify-center w-full h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white! rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest!"
                >
                  Get Started
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — image matches content column height */}
          <ScrollReveal className="w-full h-full order-1 lg:order-2 ">
            <div className=" relative w-full h-full min-h-105 rounded-2xl overflow-hidden aspect-3/4 sm:aspect-2/3 lg:aspect-auto">
              <Image
                src="/images/GIRL HOLDING BOX.png"
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
