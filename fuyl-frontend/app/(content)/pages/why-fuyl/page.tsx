import Image from 'next/image'
import Link from 'next/link'
import { generateSEO } from '@/lib/utils/seo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { PillarTabs } from '@/components/why-fuyl/PillarTabs'

export const metadata = generateSEO({
  title: 'Why FUYL',
  description:
    'Why most supplements fail and how FUYL COMPLETE+ was built differently — transparent doses, clinical ingredients, made for the modern Indian body.',
  url: 'https://fuyl.in/pages/why-fuyl',
})

export default function WhyFuylPage() {
  return (
    <>

      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">

        {/* Background image */}
        <Image
          src="/images/ingredients-hero.webp"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
          aria-hidden="true"
        />

        {/* Black overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content — left aligned */}
        <div className="container-brand relative z-10 py-28 lg:py-36">
          <ScrollReveal>
            <div className="max-w-2xl">

              <p
                className="text-label mb-4 text-sm font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-brand-teal)' }}
              >
                Our Philosophy
              </p>

              <h1
                className="text-display-2xl font-display mb-6 text-white leading-[0.9]"
              >
                WHY FUYL
                <br />
                EXISTS.
              </h1>

              <p className="text-body-lg max-w-xl leading-relaxed text-white/70">
                The Indian supplement industry is broken. Most products are
                under-dosed, over-marketed, and built around Western nutritional
                profiles that don&apos;t account for how Indian bodies eat, live and
                work. We built FUYL to fix that.
              </p>

            </div>
          </ScrollReveal>
        </div>

      </section>


      {/* Our pillars */}
      <section
        className="section-py"
        style={{ background: 'var(--color-brand-white)' }}
      >
        <div className="container-brand">

          <ScrollReveal>
            <p
              className="text-label text-center mb-3 text-sm font-bold tracking-widest uppercase"
              style={{ color: 'var(--color-brand-berry)' }}
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
                  className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-rose text-white rounded-sm transition-colors hover:bg-brand-rose-dark"
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
  )
}
