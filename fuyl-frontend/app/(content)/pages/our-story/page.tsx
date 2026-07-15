import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata = generateSEO({
  title: "Our Story",
  description:
    "The story behind FUYL — why we built it, who built it, and what we are building toward.",
  url: "https://fuyl.in/pages/our-story",
});

// `body` may contain simple inline HTML (e.g. <strong>word</strong> to bold
// it) — rendered via dangerouslySetInnerHTML below, same pattern already
// used for blog post content elsewhere in this app.
const FOUNDERS = [
  {
    image: "/images/hero-slide-1.webp",
    title: "SWEEKAR SAXENA",
    body: `I am a product of "<strong>Kota Factory</strong>", an engineer, an Executive MBA from IIM Lucknow, health conscious individual. Yet, for most of my adult life, I was quietly undernourished. From avoiding vegetables as a child to surviving hostel food and then navigating a demanding career across startups like Indus OS, KiranaKing, Jugnoo, Ola and Mercedes-Benz. I discovered something many of us do far too late: <strong>eating better does not necessarily mean nourishing better.</strong>

That realization became deeply personal after my wife and I moved to the Gulf in 2017. Over the next several years, we struggled through cycles of gut issues, fatigue, stress, poor sleep, and hormonal imbalances. We tried specialists, diets, exercise, and countless supplements. The lesson that kept emerging was simple: without strong foundations micronutrition, gut health, and cellular recovery everything else works below its potential.

As I spoke to friends, founders, and professionals around me, I realized our story wasn't unique. So many people who cared about their health still felt something was missing low energy, restless sleep, an unsettled gut, and a sense of never quite feeling their best. Most had tried supplements. Few had found one they truly trusted.

That gap became the founding insight behind <strong>FUYL</strong>L. Together with Anupam, we spent months building <strong>FUYL Complete+</strong>, a daily wellness powder designed around four pillars: complete micronutrition, gut health, cellular recovery, and calm, sustained energy. Not because we wanted to create another supplement, but because we wanted to build the product we wished had existed years earlier.

<strong>LONGER . STRONGER . YOU</strong>`,
  },
  {
    image: "/images/fuyl-complete+.webp",
    title: "ANUPAM PANDEY",
    body: `The story of an average urban Indian is one long hustle. We don't inherit our place. We earn it, in a crowd, pushing because everyone around us is pushing. But the hustle always takes something in return, and for almost all of us, the first thing it quietly takes is our health.

It begins in a hostel mess and never really stops. JEE, then college, then the job in a city that runs faster than you do, then maybe UPSC in Old Rajendra Nagar. And through all of it, your career stays on point while your nutrition slips into the back seat. Then your thirties arrive, the body sends the bill, and you realise you optimised everything in your life except the one thing holding it all up.

I know this arc because I lived most of it. I always 'knew' what was missing. The fruits, the greens, the fibre, the micronutrients my body was quietly running short on. Knowing was never the problem. Time was. <strong>You cannot eat your way to a dozen fruits, a fistful of greens, and a full spread of vitamins every single day when your day has no room left in it.</strong> That gap, between what we know we should eat and what our lives allow, is where FUYL began.

So my co-founder Sweekar and I built the thing we wished existed: <strong>one honest sachet</strong>, made with care behind every choice, for people still in the middle of their hustle who shouldn't have to choose between their ambition and their health. One sachet. Every morning. Everything covered.

<strong>LONGER . STRONGER . YOU</strong>`,
  },
];

const MILESTONES = [
  {
    title: "THE IDEA",
    body: "Two founders. One shared frustration. The realisation that no single trustworthy daily nutrition product existed for the urban Indian who actually reads labels.",
  },
  {
    title: "THE FORMULATION",
    body: "Months of research. Multiple iterations. Dozens of ingredient decisions. Each one made against published clinical evidence, not marketing budgets.",
  },
  {
    title: "THE TASTE PROBLEM",
    body: "A formulation that works means nothing if people stop taking it. We tested, failed, retested. The deep berry crimson drink you hold today is the result of that process.",
  },
  {
    title: "FIRST BATCH",
    body: "Premium looking eco-friendly composite box. The 10g sachet. 15 sachets. ₹1,499. FUYL COMPLETE+ is ready.",
  },
  {
    title: "THE LAUNCH",
    body: "FUYL goes live. The beginning of building one trusted nutritional foundation for urban India.",
  },
];

const VALUES = [
  {
    title: "Radical Transparency",
    body: "You will always know exactly what is in your sachet, at exactly what dose, and why. We will never hide behind proprietary blends.",
  },
  {
    title: "Evidence Over Hype",
    body: "If an ingredient does not have peer-reviewed clinical evidence at the dose we include, it does not make the formula. Full stop.",
  },
  {
    title: "India First",
    body: "We are building for the Indian body, the Indian diet, the Indian lifestyle. Not adapting a Western product for India.",
  },
  {
    title: "Long-Term Thinking",
    body: "We are not building a supplement brand. We are building a long-term partner for your health. Every decision we make reflects that.",
  },
];

export default function OurStoryPage() {
  return (
    <>
      {/* ── 1. Hero / Header ─────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-forest px-4 sm:px-8 py-16 sm:py-20 lg:py-24 text-center">
        {/* Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <span className="text-[120px] sm:text-[220px] lg:text-[320px] font-black leading-none tracking-[-8px] text-white/3 whitespace-nowrap">
            FUYL
          </span>
        </div>

        <Breadcrumbs
          variant="dark"
          className="relative mb-8 flex justify-center"
          items={[{ label: "Our Story" }]}
        />

        <p className="relative text-[10px] uppercase tracking-[4px] text-brand-sage mb-6 sm:mb-7">
          The Story Behind FUYL
        </p>

        <blockquote className="relative mx-auto mb-6 max-w-3xl font-normal italic leading-relaxed text-white text-lg sm:text-2xl md:text-[28px]">
          <span className="not-italic text-brand-sage text-4xl sm:text-[64px] lg:text-[80px] leading-[0.5] align-[-14px] sm:align-[-22px] lg:align-[-28px] mr-1">
            &ldquo;
          </span>
          We didn&apos;t set out to build a supplement brand. We set out to
          solve our own problem — and found that millions of Indians shared it.
          <span className="not-italic text-brand-sage text-4xl sm:text-[64px] lg:text-[80px] leading-[0.5] align-[-14px] sm:align-[-22px] lg:align-[-28px] ml-1">
            &rdquo;
          </span>
        </blockquote>

        <div className="mx-auto mb-5 h-px w-10 bg-brand-sage" />

        <p className="text-[11px] uppercase tracking-[2px] text-white/40">
          The Founders · FUYL
        </p>
      </section>

      {/* ── 2. Two-Column Feature ─────────────────────── */}
      <section className="section-py bg-brand-cream">
        <div className="container-brand">
          <div className="flex flex-col items-stretch md:flex-row">
            {FOUNDERS.map(({ image, title, body }, i) => (
              <Fragment key={title}>
                {/* Divider — horizontal on mobile, vertical on desktop */}
                {i > 0 && (
                  <div className="flex items-center justify-center py-10 md:py-0 md:px-8">
                    <div className="h-px w-full bg-brand-border md:h-full md:w-px" />
                  </div>
                )}

                <ScrollReveal delay={i * 120} className="flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-7 text-center px-4 py-2">
                    <div className="relative h-64 w-64 sm:h-80 sm:w-80 shrink-0 overflow-hidden rounded-full border-[5px] border-brand-border shadow-lg">
                      <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 256px, 320px"
                      />
                    </div>
                    <div>
                      <h3 className="text-display-md font-display mb-4 text-center">
                        {title.toUpperCase()}
                      </h3>
                      <p
                        className="mx-auto max-w-xl whitespace-pre-line text-body-md leading-relaxed text-brand-muted text-justify"
                        dangerouslySetInnerHTML={{ __html: body }}
                      />
                    </div>
                  </div>
                </ScrollReveal>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Horizontal Timeline ─────────────────────── */}
      <section className="section-py bg-brand-white">
        <div className="container-brand">
          <ScrollReveal>
            <h2 className="text-display-xl font-display mb-14 text-center">
              THE TIMELINE
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            {/* 5 items × ~200px ≈ 1000px — triggers scroll on narrower screens */}
            <div className="overflow-x-auto pb-6">
              <div className="relative flex min-w-250">
                {/* Single track line behind all dots */}
                <div className="absolute left-0 right-0 top-4 h-px bg-brand-border" />

                {MILESTONES.map(({ title, body }) => (
                  <div
                    key={title}
                    className="group relative flex flex-1 flex-col items-center"
                  >
                    {/* Dot */}
                    <div className="relative z-10 h-8 w-8 shrink-0 rounded-full border-2 border-brand-border bg-brand-white transition-all duration-300 group-hover:border-brand-forest group-hover:bg-brand-forest">
                      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-border transition-all duration-300 group-hover:bg-brand-white" />
                    </div>

                    {/* Content */}
                    <div className="mt-6 w-full rounded-sm border border-transparent px-3 py-5 text-center transition-all duration-300 group-hover:border-brand-border group-hover:bg-brand-cream">
                      <p className="text-label mb-2 text-brand-muted transition-colors group-hover:text-brand-forest">
                        {title}
                      </p>
                      <p className="text-body-xs leading-relaxed text-brand-muted text-justify">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 4. Values ─────────────────────────────────── */}
      {/* <section className="section-py bg-brand-cream">
        <div className="container-brand">
          <ScrollReveal>
            <h2 className="text-display-xl font-display mb-14 text-center">
              OUR VALUES
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {VALUES.map(({ title, body }, i) => (
              <ScrollReveal key={title} delay={i * 80}>
                <div className="h-full rounded-sm border border-brand-border bg-brand-white p-7 transition-shadow hover:shadow-md">
                  <p className="text-body-lg font-semibold mb-3">{title}</p>
                  <p className="text-body-md leading-relaxed text-brand-muted">
                    {body}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section> */}

      {/* ── 5. CTA ────────────────────────────────────── */}
      <section className="py-16 sm:py-20 text-center bg-white">
        <ScrollReveal>
          <div className="container-brand mx-auto max-w-3xl">
            <p className="text-display-lg font-display mb-4 text-brand-forest">
              THIS IS WHAT WE BUILT.
            </p>
            <p className="text-body-lg mb-10 text-brand-muted">
              Nourish Daily. Feel Stronger. Live Longer.
            </p>

            <div className="mb-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/products/fuyl-complete"
                className="inline-flex h-12 items-center justify-center rounded-sm bg-brand-forest px-6 sm:px-10 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-brand-sage hover:text-brand-forest"
              >
                Try FUYL Complete+ — ₹1,499 for 15 sachets →
              </Link>
              {/* <Link
                href="/pages/contact"
                className="inline-flex h-12 items-center justify-center rounded-sm border border-brand-border px-8 text-xs font-semibold uppercase tracking-widest text-brand-forest transition-colors hover:border-brand-teal hover:text-brand-teal"
              >
                Talk to Us
              </Link> */}
            </div>

            <p className="text-body-xs text-brand-muted/60 uppercase tracking-widest">
              Free shipping · Dispatched within 1 working day
            </p>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
