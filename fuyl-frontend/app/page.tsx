import { HeroSlider }          from '@/components/home/HeroSlider'
import { MarqueeStrip }        from '@/components/home/MarqueeStrip'
import { ProblemSection }      from '@/components/home/ProblemSection'
import { ProductSpotlight }    from '@/components/home/ProductSpotlight'
import { IngredientsGrid }     from '@/components/home/IngredientsGrid'
import { ThirtyDayPath }       from '@/components/home/ThirtyDayPath'
import { VideoSection }        from '@/components/home/VideoSection'
import { JoinOurTeam }         from '@/components/home/JoinOurTeam'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { FaqSection }          from '@/components/home/FaqSection'
import { AmbassadorSection }   from '@/components/home/AmbassadorSection'
import { InstagramFeed }       from '@/components/home/InstagramFeed'
import { NewsletterSection }   from '@/components/home/NewsletterSection'
import { generateSEO }         from '@/lib/utils/seo'
import { getStorefrontHero, getTestimonials, getFAQs, getIngredients } from '@/lib/api/content'

export const metadata = generateSEO({
  title:       'Complete Daily Nutrition',
  description: 'Daily nutrition powder with 60+ premium ingredients — gut health, energy, immunity, liver support — in one sachet every morning.',
  url:         'https://fuyl.in',
})

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [hero,testimonials,faqs,ingredients] = await Promise.all([getStorefrontHero(),getTestimonials(),getFAQs().catch(() => undefined),getIngredients().catch(() => undefined)])
  return (
    <>
      {/* 1 — Hero */}
      {hero?.isActive !== false && (
        <HeroSlider slides={hero?.slides} autoplayMs={hero?.autoplayMs} />
      )}

      {/* 2 — Marquee ticker */}
      <MarqueeStrip />

      {/* 3 — Problem / pain points */}
      <ProblemSection />

      {/* 4 — Product spotlight (dark) */}
      <ProductSpotlight />

      {/* 5 — Ingredients grid */}
      <IngredientsGrid managed={ingredients} />

      {/* 6 — 30-Day journey */}
      <ThirtyDayPath />

      {/* 7 — Video + launch countdown (dark) */}
      <VideoSection />

      {/* 8 — Join our team */}
      <JoinOurTeam />

      {/* 9 — Testimonials */}
      <TestimonialsSection managed={testimonials} />

      {/* 10 — FAQ */}
      <FaqSection managed={faqs} />

      {/* 11 — Ambassador / referral */}
      <AmbassadorSection />

      {/* 12 — Instagram feed */}
      <InstagramFeed />

      {/* 13 — Newsletter (berry) */}
      <NewsletterSection />
    </>
  )
}
