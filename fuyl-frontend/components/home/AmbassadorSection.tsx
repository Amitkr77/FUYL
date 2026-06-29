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

const PERKS = ["Up to 15% per order", "No minimum sales", "Cancel anytime", "Instant payouts"];

export function AmbassadorSection() {
  return (
    <section className="section-py bg-brand-forest text-white overflow-hidden">
      <div className="container-brand">

        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-teal mb-4">
              FUYL Ambassador Programme
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-5">
              FOUND SOMETHING
              THAT WORKS?<br />
              <span className="text-brand-teal">SHARE IT. EARN.</span>
            </h2>
            <p className="text-base text-white/55 leading-relaxed">
              Refer friends, family or your audience and earn up to 15% on every order — automatically.
            </p>
          </div>
        </ScrollReveal>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-14">
          {STEPS.map(({ n, title, body }, i) => (
            <ScrollReveal key={n} delay={i * 100}>
              <div className="relative flex flex-col gap-5 p-7 rounded-2xl border border-white/8 bg-white/5 h-full overflow-hidden group hover:bg-white/8 transition-colors duration-300">

                {/* Large watermark number */}
                <span className="absolute -top-3 -right-1 font-display text-[96px] font-bold leading-none text-white/4 select-none pointer-events-none">
                  {n}
                </span>

                {/* Step badge */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-rose/15 border border-brand-rose/30 text-brand-rose text-sm font-bold shrink-0">
                    {n.replace("0", "")}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="relative z-10 flex flex-col gap-3">
                  <p className="text-base font-semibold leading-snug text-white">
                    {title}
                  </p>
                  <p className="text-sm text-white/50 leading-relaxed">
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
              href={SITE.referral}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-rose text-white rounded-lg transition-colors hover:bg-brand-rose-dark"
            >
              Join the Programme →
            </Link>

            {/* Perks row */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {PERKS.map((perk, i) => (
                <span key={perk} className="flex items-center gap-2 text-[12px] text-white/45">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20" />}
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