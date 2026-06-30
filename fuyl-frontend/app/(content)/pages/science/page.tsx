import Link from 'next/link'
import { generateSEO } from '@/lib/utils/seo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { SciencePillar } from '@/components/content/SciencePillar'
import { MarqueeStrip } from '@/components/home/MarqueeStrip'

export const metadata = generateSEO({
  title:       'The Science',
  description: 'The clinical research and peer-reviewed evidence behind every key ingredient in FUYL COMPLETE+.',
  url:         'https://fuyl.in/pages/science',
})

const PILLARS = [
  {
    n:    '01',
    title:'Gut Health',
    body: 'The gut is your second brain — and the foundation of everything else. 70% of your immune system lives in your gut. Poor gut health leads to nutrient malabsorption, inflammation, brain fog and low immunity. FUYL addresses gut health with a clinical combination of spore-forming probiotics and a full digestive enzyme blend, ensuring both the microbiome and the digestion process are optimised.',
    ingredients: ['Bacillus Coagulans (2B CFU)', 'Protease, Amylase, Lipase', 'Cellulase & Lactase'],
    study:  { label: 'Read the probiotic research', href: 'https://pubmed.ncbi.nlm.nih.gov/30000783/' },
    accent: '#22C55E',
    bg:     '#F0FDF4',
  },
  {
    n:    '02',
    title:'Energy & Vitality',
    body: 'Fatigue is not a caffeine deficiency — it is a micronutrient deficiency. Spirulina provides bioavailable protein, iron and B-vitamins. Magnesium activates over 300 enzymatic reactions that produce ATP. Vitamin B12 and D3 round out the energy equation. The result is sustained, stimulant-free energy that doesn\'t crash.',
    ingredients: ['Spirulina (500mg)', 'Magnesium Glycinate (100mg)', 'Vitamin B12, D3'],
    accent: '#F59E0B',
    bg:     '#FFFBEB',
    flip:   true,
  },
  {
    n:    '03',
    title:'Stress & Cognition',
    body: 'Chronic stress is the silent epidemic of modern India. Elevated cortisol degrades memory, disrupts sleep, weakens immunity and accelerates ageing. KSM-66® Ashwagandha is the most extensively studied adaptogen in the world — with 22+ clinical trials demonstrating measurable reductions in cortisol, anxiety and sleep latency.',
    ingredients: ['KSM-66® Ashwagandha (300mg)', 'Bacopa Monnieri', 'Magnesium Glycinate'],
    study: { label: 'See the Ashwagandha studies', href: 'https://pubmed.ncbi.nlm.nih.gov/31517876/' },
    accent: '#8B1A4A',
    bg:     '#FDF2F8',
  },
  {
    n:    '04',
    title:'Immunity',
    body: 'Your immune system requires a constant supply of specific micronutrients to function correctly. Vitamin C (via Amla), Vitamin D3, Zinc and the probiotic strains in FUYL work in concert to maintain both the innate and adaptive immune responses — without over-stimulating them.',
    ingredients: ['Amla Extract (500mg)', 'Vitamin D3 (1000 IU)', 'Zinc, Selenium'],
    accent: '#3B82F6',
    bg:     '#EFF6FF',
    flip:   true,
  },
  {
    n:    '05',
    title:'Liver Support',
    body: 'The liver performs over 500 functions — and modern life taxes it relentlessly with processed foods, alcohol, medications and environmental toxins. Milk Thistle\'s active compound Silymarin is one of the most researched hepatoprotective agents in medicine, proven to support liver cell regeneration and protect against oxidative stress.',
    ingredients: ['Milk Thistle (Silymarin 200mg)', 'N-Acetyl Cysteine', 'Turmeric (Curcumin)'],
    study: { label: 'Silymarin clinical evidence', href: 'https://pubmed.ncbi.nlm.nih.gov/15481763/' },
    accent: '#10B981',
    bg:     '#ECFDF5',
  },
  {
    n:    '06',
    title:'Heart & Brain',
    body: 'Omega-3 fatty acids are critical for cardiovascular health, brain function, and inflammation management — yet most Indians consume far below recommended levels. FUYL provides plant-sourced ALA from flaxseed, alongside antioxidants that protect lipid membranes from oxidative damage.',
    ingredients: ['Omega-3 ALA (250mg)', 'Coenzyme Q10', 'Grape Seed Extract'],
    accent: '#6366F1',
    bg:     '#EEF2FF',
    flip:   true,
  },
]

const STATS = [
  { number: '60+',  label: 'Active Ingredients' },
  { number: '22+',  label: 'Clinical Studies Referenced' },
  { number: '100%', label: 'Transparent Labelling' },
  { number: '0',    label: 'Proprietary Blends' },
]

export default function SciencePage() {
  return (
    <>
      {/* Hero */}
      <section className="section-py bg-brand-cream overflow-hidden relative">

        {/* Decorative watermark */}
        <p className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-display font-black leading-none text-brand-forest/4 text-[clamp(6rem,20vw,16rem)] overflow-hidden" aria-hidden="true">
          SCIENCE
        </p>

        <div className="container-brand max-w-4xl mx-auto text-center relative">
          <ScrollReveal>
            <p className="text-label mb-3 text-brand-teal">Evidence-Based Nutrition</p>
            <h1 className="text-display-2xl font-display mb-6 text-brand-forest">
              THE SCIENCE
              <br className="hidden sm:block" />
              {' '}BEHIND
              <br className="hidden sm:block" />
              {' '}EVERY SACHET.
            </h1>
            <p className="text-body-lg max-w-2xl mx-auto text-brand-muted">
              Every ingredient in FUYL COMPLETE+ is backed by peer-reviewed clinical research. Here is the evidence.
            </p>
          </ScrollReveal>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mt-12 sm:mt-16">
            {STATS.map(({ number, label }, i) => (
              <ScrollReveal key={label} delay={i * 80}>
                <div className="p-6 rounded-sm bg-white border border-brand-border">
                  <p className="text-display-lg font-display text-brand-teal">
                    {number}
                  </p>
                  <p className="text-body-xs mt-1 text-brand-muted">{label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <MarqueeStrip variant="olive" />

      {/* Science pillars */}
      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand space-y-24">
          {PILLARS.map((pillar) => (
            <SciencePillar key={pillar.n} {...pillar} />
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-10" style={{ borderTop: '1px solid var(--color-brand-border)' }}>
        <div className="container-brand max-w-3xl mx-auto">
          <p className="text-body-xs text-center" style={{ color: 'var(--color-brand-muted)' }}>
            * These statements have not been evaluated by the Food Safety and Standards Authority of India (FSSAI) as disease claims. FUYL COMPLETE+ is a food supplement, not a medicine. Individual results may vary. Always consult a qualified healthcare professional before starting any supplement regimen, especially if you are pregnant, breastfeeding, or on prescription medication.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center" style={{ background: 'var(--color-brand-cream)' }}>
        <ScrollReveal>
          <p className="text-display-lg font-display mb-4 px-4">SEE EVERY INGREDIENT IN DETAIL</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center px-4">
            <Link
              href="/pages/ingredients"
              className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-rose text-white rounded-sm transition-colors hover:bg-brand-rose-dark w-full sm:w-auto"
            >
              View All Ingredients →
            </Link>
            <Link
              href="/products/fuyl-complete"
              className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest border border-brand-forest text-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white w-full sm:w-auto"
            >
              Shop Now
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </>
  )
}
