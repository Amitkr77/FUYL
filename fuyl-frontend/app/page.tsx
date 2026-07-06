import { HeroSlider }          from '@/components/home/HeroSlider'
import { MarqueeStrip }        from '@/components/home/MarqueeStrip'
import { ProblemSection }      from '@/components/home/ProblemSection'
import { ProductSpotlight }    from '@/components/home/ProductSpotlight'
import { IngredientsGrid }     from '@/components/home/IngredientsGrid'
import { ThirtyDayPath }       from '@/components/home/ThirtyDayPath'
import { VideoSection }        from '@/components/home/VideoSection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { FaqSection }          from '@/components/home/FaqSection'
import { AmbassadorSection }   from '@/components/home/AmbassadorSection'
import { InstagramFeed }       from '@/components/home/InstagramFeed'
import { NewsletterSection }   from '@/components/home/NewsletterSection'
import { generateSEO }         from '@/lib/utils/seo'

export const metadata = generateSEO({
  title:       'Complete Daily Nutrition',
  description: 'Daily nutrition powder with 60+ premium ingredients — gut health, energy, immunity, liver support — in one sachet every morning.',
  url:         'https://fuyl.in',
})

export default function HomePage() {
  return (
    <>
      {/* 1 — Hero */}
      <HeroSlider />

      {/* 2 — Marquee ticker */}
      <MarqueeStrip />

      {/* 3 — Problem / pain points */}
      <ProblemSection />

      {/* 4 — Product spotlight (dark) */}
      <ProductSpotlight />

      {/* 5 — Ingredients grid */}
      <IngredientsGrid />

      {/* 6 — 30-Day journey */}
      <ThirtyDayPath />

      {/* 7 — Video + launch countdown (dark) */}
      <VideoSection />

      {/* 8 — Testimonials */}
      <TestimonialsSection />

      {/* 9 — FAQ */}
      <FaqSection />

      {/* 10 — Ambassador / referral */}
      <AmbassadorSection />

      {/* 11 — Instagram feed */}
      <InstagramFeed />

      {/* 12 — Newsletter (berry) */}
      <NewsletterSection />
    </>
  )
}
