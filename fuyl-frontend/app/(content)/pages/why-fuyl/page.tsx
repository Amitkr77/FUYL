import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PillarTabs } from "@/components/why-fuyl/PillarTabs";
import { getWhyFuylCMS } from "@/lib/api/content";
import { notFound } from "next/navigation";

export const metadata = generateSEO({
  title: "Why FUYL",
  description:
    "Why most supplements fail and how FUYL COMPLETE+ was built differently — transparent doses, clinical ingredients, made for the modern Indian body.",
  url: "https://fuyl.in/pages/why-fuyl",
});

const DEFAULT_HEADLINE = "WHY FUYL COMPLETE+ IS DIFFERENT";
const DEFAULT_DESCRIPTION =
  "We built COMPLETE+ because the daily nutritional supplement industry has failed the health-conscious consumer through token doses, cheap ingredient forms, claims that do not hold up, and products too unpleasant to take consistently. Here is exactly how we think about every decision in this formulation.";
const DEFAULT_IMAGE = "/images/We_are_different-hero.webp";
const DEFAULT_CTA_LABEL = "Taste Now";
const DEFAULT_CTA_HREF = "/products/fuyl-complete";
const DEFAULT_PILLARS_HEADLINE = "PILLARS THAT MAKE FUYL";
const DEFAULT_PILLARS_SUBHEADLINE =
  "DISCOVER THE USPs THAT MAKE OUR PRODUCTS EXCEPTIONAL";

export default async function WhyFuylPage() {
  const cms = await getWhyFuylCMS();
  if (cms?.isActive === false) notFound();
  const managed = cms?.data;

  const heroHeadline = managed?.heroHeadline ?? DEFAULT_HEADLINE;
  const heroDescription = managed?.heroDescription ?? DEFAULT_DESCRIPTION;
  const heroImage = managed?.heroImage ?? DEFAULT_IMAGE;
  const ctaLabel = managed?.ctaLabel ?? DEFAULT_CTA_LABEL;
  const ctaHref = managed?.ctaHref ?? DEFAULT_CTA_HREF;
  const pillarsHeadline = managed?.pillarsHeadline ?? DEFAULT_PILLARS_HEADLINE;
  const pillarsSubheadline =
    managed?.pillarsSubheadline ?? DEFAULT_PILLARS_SUBHEADLINE;

  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[60vh]">
        {/* Left — Content */}
        <div className="order-2 lg:order-1 bg-brand-cream flex flex-col px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <Breadcrumbs className="mb-5" items={[{ label: "Why FUYL" }]} />
          <div className="flex flex-1 items-center py-10 lg:py-20">
            <ScrollReveal>
              <h1 className="text-display-xl font-display text-brand-forest mb-6">
                {heroHeadline}
              </h1>
              <p className="text-body-md text-brand-muted leading-relaxed max-w-xl text-justify">
                {heroDescription}
              </p>
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest mt-6"
              >
                {ctaLabel}
              </Link>
            </ScrollReveal>
          </div>
        </div>

        {/* Right — Image */}
        <div className="order-1 lg:order-2 relative min-h-[50vh] lg:min-h-0">
          <Image
            src={heroImage}
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
            <h2 className="text-display-xl font-display text-center mb-5 text-brand-forest">
              {pillarsHeadline}
            </h2>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-xl mx-auto text-center mb-6">
              {pillarsSubheadline}
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
                  href={ctaHref}
                  className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
