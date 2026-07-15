import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function JoinOurTeam() {
  return (
    <section className="section-py bg-white">
      <div className="container-brand max-w-2xl mx-auto text-center">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label">
              Careers at FUYL
            </span>
          </div>
          <h2 className="text-display-xl font-display mb-5 text-brand-forest">
            BE PART OF SOMETHING BUILT
            <br />
            TO LAST INSIDE AND OUT
          </h2>
          <p className="text-body-md text-brand-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Join the FUYL team. Driven by science, guided by purpose, and
            committed to building health that endures for a billion Indians
            and beyond.
          </p>
          <Link
            href="/pages/contact"
            className="inline-flex items-center justify-center h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
          >
            Join Our Team →
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
