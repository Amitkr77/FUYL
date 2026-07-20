import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PillarTabs } from "@/components/why-fuyl/PillarTabs";

export const metadata = generateSEO({
  title: "Why FUYL",
  description:
    "Why most supplements fail and how FUYL COMPLETE+ was built differently — transparent doses, clinical ingredients, made for the modern Indian body.",
  url: "https://fuyl.in/pages/why-fuyl",
});

export default function WhyFuylPage() {
  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[60vh]">
        {/* Left — Content */}
        <div className="order-2 lg:order-1 bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <ScrollReveal>
            <Breadcrumbs className="mb-5" items={[{ label: "Why FUYL" }]} />
            {/* <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label mb-5">
              Our Philosophy
            </span> */}
            <h1 className="text-display-xl font-display text-brand-forest mb-6">
              WHY FUYL COMPLETE+ IS DIFFERENT
            </h1>
            <p className="text-body-md text-brand-muted leading-relaxed max-w-xl text-justify">
              We built COMPLETE+ because the daily nutritional supplement
              industry has failed the health-conscious consumer through token
              doses, cheap ingredient forms, claims that do not hold up, and
              products too unpleasant to take consistently. Here is exactly how
              we think about every decision in this formulation.
            </p>
            {/* cta button "shop now" */}
            <Link
              href="/collections/all"
              className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest mt-6"
            >
              Shop Now
            </Link>
          </ScrollReveal>
        </div>

        {/* Right — Image */}
        <div className="order-1 lg:order-2 relative min-h-[50vh] lg:min-h-0">
          <Image
            src="/images/We_are_different-hero.webp"
            alt="FUYL ingredients"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </section>

      {/* Our pillars */}
      <section
        className="section-py"
        style={{ background: "var(--color-brand-white)" }}
      >
        <div className="container-brand">
          <ScrollReveal>
            {/* <p
              className="text-label text-center mb-3 text-sm font-bold tracking-widest uppercase"
              style={{ color: "var(--color-brand-berry)" }}
            >
              The FUYL Difference
            </p> */}

            <h2 className="text-display-xl font-display text-center mb-5 text-brand-forest">
              PILLARS THAT MAKE FUYL
            </h2>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-xl mx-auto text-center mb-6">
              DISCOVER THE USPs THAT MAKE OUR PRODUCTS EXCEPTIONAL
            </p>
          </ScrollReveal>

          <PillarTabs />
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="container-brand">
          <ScrollReveal>
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/products/fuyl-complete"
                  className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
                >
                  Shop FUYL COMPLETE+
                </Link>
                <Link
                  href="/pages/ingredients"
                  className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest border  text-brand-forest border-brand-forest rounded-sm transition-colors hover:border-brand-teal hover:text-white hover:bg-brand-forest"
                >
                  Explore Ingredients
                </Link>
              </div>
              <p className="text-brand-olive-light text-xs tracking-wide">
                30-day money-back guarantee · FSSAI certified · 100% vegetarian
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
