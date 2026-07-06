import Link from "next/link";
import Image from "next/image";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { formatPrice } from "@/lib/utils/formatPrice";

const BENEFITS = [
  {
    title: "60+ Premium Ingredients",
    text: "Greens, Berries, Fruits, Superfoods, Detox Blend, Adaptogens, Prebiotics, Probiotics, Digestive Enzymes, Omegas, Antioxidants, Micronutrients, Monkfruit",
  },
  {
    title: "Research-Informed Dosing",
    text: "Ingredient at doses that actually work. Not token amounts that look good on paper but deliver nothing in the body.",
  },
  {
    title: "Better Absorption Where It Matters",
    text: "Most formulations put the right ingredients in the wrong form. We chose forms your body actually recognises and uses. So nothing goes to waste.",
  },
  {
    title: "Good Science Great Taste",
    text: "A daily that you will actually look forward to every morning. Because the one you enjoy taking is the one that changes your health.",
  },
];

export function ProductSpotlight() {
  return (
    <section className="section-py bg-brand-forest text-white overflow-hidden">
      {/* Full-bleed grid — no container so image can reach the left edge */}
      <div className="grid grid-cols-1 gap-8 lg:gap-0 lg:grid-cols-2 container-brand">
        {/* Image column — fills the row height driven by the copy column */}
        <ScrollReveal className="relative min-h-72 sm:min-h-96 lg:min-h-0">
          <Image
            src="/images/fuyl-complete+.webp"
            alt="FUYL COMPLETE+"
            fill
            className="object-cover object-center rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute bottom-4 left-4 rounded-sm bg-brand-forest px-3 py-1.5">
            <p className="text-label text-white">
              Only {formatPrice(1499)} / 15 sachets
            </p>
          </div>
        </ScrollReveal>

        {/* Copy column — sets the section height */}
        <div className="flex flex-col gap-6 px-0 lg:px-8">
          <ScrollReveal>
            <span className="inline-block rounded-full px-3 py-1 bg-white/10 text-white text-label">
              complete daily wellness
            </span>
            <h2 className="text-display-xl font-display mt-3">
              FUYL COMPLETE+
            </h2>
            <h3 className="mt-1 text-white/60 font-normal">
              Daily Nutrition Powder
            </h3>
            <p className="text-body-lg mt-4 text-white/65 text-justify">
              One sachet. Every morning. 60+ research-informed ingredients
              covering gut health, energy, immunity, liver support, stress,
              antioxidant protection, skin & cellular protection. Built for the
              urban Indian who wants complete daily nutrition without the
              complexity.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFITS.map(({ title, text }) => (
                <div
                  key={title}
                  className="rounded-lg border border-white/15 bg-white/5 p-5"
                >
                  <h3 className="text-body-md font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-body-sm leading-relaxed text-white/65 text-justify">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 items-center lg:items-start">
              <Link
                href="/products/fuyl-complete"
                className="inline-flex items-center justify-center w-full sm:w-auto h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest border border-brand-sage"
              >
                Shop Now — {formatPrice(1499)}
              </Link>
              {/* <Link
                href="/pages/ingredients"
                className="inline-flex items-center justify-center w-full sm:w-auto h-12 px-6 text-xs font-semibold uppercase tracking-widest rounded-sm border border-white/25 text-white/75 transition-colors hover:border-brand-teal hover:text-brand-teal"
              >
                See All Ingredients
              </Link> */}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
