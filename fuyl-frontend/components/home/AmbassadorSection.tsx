import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE } from "@/lib/constants/site";

const STEPS = [
  {
    n: "01",
    title: "Try FUYL COMPLETE+ For 30 Days",
    body: "Experience the difference yourself first. The best referrals come from genuine use.",
  },
  {
    n: "02",
    title: "Get Your Referral Link",
    body: "Your unique link is generated automatically from your account page after your first order.",
  },
  {
    n: "03",
    title: "Share It. Earn Up To 15% On Every Sale",
    body: "Share on WhatsApp, Instagram, Meta, Pinterest or in person. Earn up to 15% on every order placed through your link.",
  },
];

const PERKS = [
  "Up to 15% per order",
  "No minimum sales",
  "Cancel anytime",
  "Instant payouts",
];

export function AmbassadorSection() {
  return (
    <section className="section-py bg-neutral-100 overflow-hidden">
      <div className="container-brand">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
            <div className="flex justify-center mb-4">
              <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label">
                FUYL Ambassador Programme
              </span>
            </div>
            <h2 className="text-display-xl font-display mb-5 text-brand-forest">
              BECOME A FUYL AMBASSADOR
              <br />
            </h2>
            <p className="text-sm sm:text-base text-brand-muted leading-relaxed">
              Found something that works? SHARE. REFER. EARN.
              <span className="text-brand-teal"></span>
            </p>
          </div>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-14">
          {STEPS.map(({ n, title, body }, i) => (
            <ScrollReveal key={n} delay={i * 100}>
              <div className="relative flex flex-col gap-5 p-5 sm:p-7 rounded-2xl border border-brand-border bg-white h-full overflow-hidden group hover:bg-brand-cream transition-colors duration-300">
                {/* Large watermark number */}
                <span className="absolute -top-3 -right-1 font-display text-[96px] font-bold leading-none text-brand-forest/5 select-none pointer-events-none">
                  {n}
                </span>

                {/* Step badge */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-forest/15 border border-brand-forest/30 text-brand-forest text-sm font-bold shrink-0">
                    {n.replace("0", "")}
                  </span>
                  <div className="h-px flex-1 bg-brand-border" />
                </div>

                <div className="relative z-10 flex flex-col gap-3">
                  <p className="text-base font-semibold leading-snug text-brand-forest">
                    {title}
                  </p>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA block */}
        <ScrollReveal delay={350}>
          <div className="flex flex-col items-center gap-6 text-center">
            <Link
              href="/pages/refer-and-earn"
              className="inline-flex items-center justify-center h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-lg transition-colors hover:bg-brand-sage hover:text-brand-forest"
            >
              Join the Programme →
            </Link>

            {/* Perks row */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {PERKS.map((perk, i) => (
                <span
                  key={perk}
                  className="flex items-center gap-2 text-[12px] text-brand-muted"
                >
                  {i > 0 && (
                    <span className="w-1 h-1 rounded-full bg-brand-border" />
                  )}
                  {perk}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
