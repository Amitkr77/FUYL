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
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        {/* Left — Content */}
        <div className="bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <ScrollReveal>
            <Breadcrumbs className="mb-5" items={[{ label: "Why FUYL" }]} />
            <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label mb-5">
              Our Philosophy
            </span>
            <h1 className="text-display-2xl font-display text-brand-forest mb-6">
              WHY FUYL
              <br />
              EXISTS.
            </h1>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-lg">
              The Indian supplement industry is broken. Most products are
              under-dosed, over-marketed, and built around Western nutritional
              profiles that don&apos;t account for how Indian bodies eat, live
              and work. We built FUYL to fix that.
            </p>
          </ScrollReveal>
        </div>

        {/* Right — Image */}
        <div className="relative min-h-[50vh] lg:min-h-0">
          <Image
            src="/images/ingredients-hero.webp"
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
            <p
              className="text-label text-center mb-3 text-sm font-bold tracking-widest uppercase"
              style={{ color: "var(--color-brand-berry)" }}
            >
              The FUYL Difference
            </p>
            <h2 className="text-display-xl font-display text-center mb-14 text-brand-forest">
              HOW WE DO
              <br />
              THINGS DIFFERENTLY.
            </h2>
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
