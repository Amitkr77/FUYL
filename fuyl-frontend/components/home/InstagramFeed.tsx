import Link from 'next/link'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { SITE } from '@/lib/constants/site'

const PLACEHOLDERS = Array.from({ length: 6 }, (_, i) => ({
  id:  `ig-${i}`,
  src: `https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg`,
  alt: `FUYL Instagram post ${i + 1}`,
}))

export function InstagramFeed() {
  return (
    <section className="section-py bg-white">
      <div className="container-brand">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-label mb-2 text-brand-teal">
                @fuylnutrition
              </p>
              <h2 className="text-display-lg font-display text-brand-forest">
                JOIN THE COMMUNITY
              </h2>
            </div>
            {/* Teal link — interactive secondary action */}
            <Link
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm font-semibold shrink-0 text-brand-teal hover:text-brand-teal-dark transition-colors"
            >
              Follow on Instagram →
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PLACEHOLDERS.map(({ id, src, alt }, i) => (
            <ScrollReveal key={id} delay={i * 40}>
              <Link
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-square overflow-hidden rounded-sm group bg-brand-sage"
              >
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Teal hover overlay — interactive element */}
                <div className="absolute inset-0 bg-brand-teal/0 group-hover:bg-brand-teal/25 transition-colors duration-300" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
