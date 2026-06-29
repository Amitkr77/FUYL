import Link from 'next/link'
import Image from 'next/image'
import { generateSEO } from '@/lib/utils/seo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { MarqueeStrip } from '@/components/home/MarqueeStrip'

export const metadata = generateSEO({
  title:       'Our Story',
  description: 'The story behind FUYL — why we built it, who built it, and what we are building toward.',
  url:         'https://fuyl.in/pages/our-story',
})

const MILESTONES = [
  { year: '2022', event: 'The Problem', body: 'Two friends, both chronically fatigued despite "eating well," discover they share a common issue — 6 micronutrient deficiencies diagnosed at the same time. A deep dive into the Indian supplement industry follows.' },
  { year: '2023', event: 'The Research', body: '14 months of formulation research. 200+ clinical studies reviewed. Dozens of ingredient suppliers evaluated. The non-negotiables established: transparent doses, clinical ingredients, nothing artificial.' },
  { year: '2024', event: 'The Formula', body: 'FUYL COMPLETE+ finalised after 8 prototype iterations and feedback from 50 beta testers — nutritionists, athletes, office workers and homemakers. FSSAI certification secured.' },
  { year: '2025', event: 'The Launch', body: 'FUYL launches. The first batch sells out in 72 hours. The first 247 customers rate it 4.8/5. We are just getting started.' },
]

const VALUES = [
  { title: 'Radical Transparency', body: 'You will always know exactly what is in your sachet, at exactly what dose, and why. We will never hide behind proprietary blends.' },
  { title: 'Evidence Over Hype', body: 'If an ingredient does not have peer-reviewed clinical evidence at the dose we include, it does not make the formula. Full stop.' },
  { title: 'India First', body: 'We are building for the Indian body, the Indian diet, the Indian lifestyle. Not adapting a Western product for India.' },
  { title: 'Long-Term Thinking', body: 'We are not building a supplement brand. We are building a long-term partner for your health. Every decision we make reflects that.' },
]

export default function OurStoryPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-py bg-[#0A0A0A] text-[#FAFAFA]">
        <div className="container-brand max-w-4xl mx-auto">
          <ScrollReveal>
            <p className="text-label mb-3" style={{ color: 'var(--color-brand-berry)' }}>About FUYL</p>
            <h1 className="text-display-2xl font-display mb-6">
              BUILT OUT OF<br />FRUSTRATION.<br />FUELLED BY<br />SCIENCE.
            </h1>
            <p className="text-body-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
              FUYL began as a personal problem. It became a mission. Here is the unedited story of how and why we built it.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Origin story */}
      <section className="section-py" style={{ background: 'var(--color-brand-cream)' }}>
        <div className="container-brand grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20 items-center">
          <ScrollReveal>
            <div
              className="relative aspect-square max-w-md mx-auto rounded-sm overflow-hidden"
              style={{ background: '#E8D5C4' }}
            >
              <Image
                src="https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg"
                alt="FUYL founders"
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 80vw, 40vw"
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <p className="text-label mb-3" style={{ color: 'var(--color-brand-berry)' }}>The Beginning</p>
            <h2 className="text-display-lg font-display mb-5">WE WERE THE<br />PROBLEM WE SOLVED.</h2>
            <div className="space-y-4 text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
              <p>
                In 2022, both of us were the "health-conscious" type. We ate our greens, avoided junk food, went to the gym. And yet we were perpetually tired, constantly catching every virus going around, and struggling with focus at work.
              </p>
              <p>
                A routine blood test changed everything. Six micronutrient deficiencies between us — Vitamin D, B12, Iron, Magnesium, Omega-3, Zinc. All despite a seemingly good diet.
              </p>
              <p>
                We started buying supplements. Then we started reading the labels. What we found horrified us — proprietary blends, underdosed ingredients, artificial colours, and formulas clearly designed for a Western demographic with completely different nutritional needs.
              </p>
              <p>
                So we decided to build the supplement we wished existed. Two years later, FUYL COMPLETE+ is the result.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <MarqueeStrip />

      {/* Timeline */}
      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand">
          <ScrollReveal>
            <h2 className="text-display-xl font-display mb-14 text-center">THE TIMELINE</h2>
          </ScrollReveal>

          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-16 top-0 bottom-0 w-px hidden sm:block" style={{ background: 'var(--color-brand-border)' }} />

            <div className="space-y-10">
              {MILESTONES.map(({ year, event, body }, i) => (
                <ScrollReveal key={year} delay={i * 80}>
                  <div className="flex gap-8 items-start">
                    <div className="w-16 shrink-0 text-right hidden sm:block">
                      <span className="text-label" style={{ color: 'var(--color-brand-berry)' }}>{year}</span>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full mt-1 shrink-0 hidden sm:block"
                      style={{ background: 'var(--color-brand-berry)', outline: '3px solid var(--color-brand-white)', outlineOffset: '2px' }}
                    />
                    <div className="flex-1 pb-2">
                      <span className="text-label sm:hidden block mb-1" style={{ color: 'var(--color-brand-berry)' }}>{year}</span>
                      <p className="text-body-md font-semibold mb-2">{event}</p>
                      <p className="text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-py" style={{ background: 'var(--color-brand-cream)' }}>
        <div className="container-brand">
          <ScrollReveal>
            <h2 className="text-display-xl font-display text-center mb-14">OUR VALUES</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {VALUES.map(({ title, body }, i) => (
              <ScrollReveal key={title} delay={i * 80}>
                <div
                  className="p-7 rounded-sm border h-full"
                  style={{ borderColor: 'var(--color-brand-border)', background: 'var(--color-brand-white)' }}
                >
                  <p className="text-body-lg font-semibold mb-3">{title}</p>
                  <p className="text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing + CTA */}
      <section className="py-20 bg-[#0A0A0A] text-[#FAFAFA] text-center">
        <ScrollReveal>
          <div className="container-brand max-w-3xl mx-auto">
            <p className="text-display-lg font-display mb-4">
              "FUYL IS NOT A SUPPLEMENT.<br/>IT'S A COMMITMENT."
            </p>
            <p className="text-body-lg mb-10" style={{ color: 'rgba(255,255,255,0.6)' }}>
              A commitment to transparency, to science, and to your long-term health. We are honoured to be part of your journey.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/products/fuyl-complete" className="inline-flex items-center justify-center h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm transition-colors hover:bg-[#C4526A]">
                Try FUYL COMPLETE+ →
              </Link>
              <Link href="/pages/contact" className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest rounded-sm transition-colors" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}>
                Talk to Us
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  )
}
