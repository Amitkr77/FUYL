import { ScrollReveal } from "@/components/ui/ScrollReveal";
import Link from "next/link";
import Image from "next/image";

const PROBLEMS = [
  {
    icon: "/emojis/salad.avif",
    text: "Two Meals A Day. But Where Are Greens, Fruits, Berries, Micronutrients?",
  },
  {
    icon: "/emojis/brain.avif",
    text: "Something Feels Off - But You Cannot Name It.",
  },
  {
    icon: "/emojis/healthy-drink.avif",
    text: "You Tried Health Drinks, Herbal Juices. But You Stopped.",
  },
  {
    icon: "/emojis/pills-bottle.webp",
    text: "You Have Read Enough Labels To Be Skeptical.",
  },
];

export function ProblemSection() {
  return (
    <section className="section-py bg-neutral-100">
      <div className="container-brand">
        <ScrollReveal>
          <div className="flex justify-center mb-4">
            <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label">
              Sound Familiar?
            </span>
          </div>
          <h2 className="text-display-xl font-display text-center mb-14 text-brand-forest max-w-4xl mx-auto">
            {/* YOUR BODY IS TRYING TO TELL YOU SOMETHING. */}
            Sound Familiar?
          </h2>
          {/* <p className="text-body-sm text-center max-w-xl mx-auto mb-14 text-brand-muted">
            Most Indians are deficient in 5+ critical micronutrients. Your
            symptoms aren't bad luck — they're data.
          </p> */}
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(({ icon, text }, i) => (
            <ScrollReveal key={text} delay={i * 60}>
              <div
                className={`
          flex flex-col items-center p-6 sm:p-8 text-center gap-5 min-h-52
          lg:border-r lg:border-brand-border
          ${i === PROBLEMS.length - 1 ? "lg:border-r-0" : ""}
        `}
              >
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 lg:h-26 lg:w-26 items-center justify-center rounded-full bg-brand-teal/10">
                  <Image src={icon} alt="" width={50} height={50} />
                </div>

                <p className="text-body-md font-medium text-brand-forest text-justify">
                  {text}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <div className="mt-12 text-center">
            <p className="text-display-sm font-display text-brand-teal">
              FUYL COMPLETE+ was built for exactly this situation.
            </p>

            <Link
              href="/pages/why-fuyl"
              className="mt-10 inline-flex h-11 items-center justify-center rounded-sm bg-brand-forest px-8 text-xs font-semibold uppercase tracking-widest text-white! transition-colors hover:bg-brand-sage hover:text-brand-forest!"
            >
              See what makes it different →
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
