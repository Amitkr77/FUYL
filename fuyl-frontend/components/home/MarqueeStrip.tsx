import { Leaf, Zap, Shield, Heart, Brain, Sun } from 'lucide-react'

const ITEMS = [
  { icon: Leaf,   text: 'Complete Daily Nutrition' },
  { icon: Zap,    text: 'Built With 60+ Premium Ingredients' },
  { icon: Shield, text: 'Prebiotics + Probiotics + Digestive Enzymes' },
  { icon: Heart,  text: 'Gut Covered End To End' },
  { icon: Brain,  text: 'Vitamins & Minerals That Actually Absorb' },
  { icon: Sun,    text: '3 Layers Of Antioxidant Protection' },
  { icon: Leaf,   text: 'Better Energy · Stronger Immunity · Built Daily' },
  { icon: Zap,    text: 'Only Daily With Liver Support Built In' },
  { icon: Shield, text: 'Adaptogens That Target Your Stress' },
  { icon: Heart,  text: 'Real Berries · Real Colour · Nothing Artificial' },
  { icon: Brain,  text: '100% Vegetarian · Nothing Hidden · No Shortcuts' },
  { icon: Sun,    text: 'Free ShippingTastes Like A Berry Drink · Works Like A Formula' },
  { icon: Sun,    text: 'Sweetened With Monk Fruit - Zero Calorie, Natural Sweetener' },
  { icon: Sun,    text: 'Free Shipping' },
]

const ALL = [...ITEMS, ...ITEMS]

interface MarqueeStripProps {
  variant?: 'dark' | 'olive'
}

export function MarqueeStrip({ variant = 'dark' }: MarqueeStripProps) {
  /* dark → Deep Forest Green, olive → Olive Moss */
  const bg  = variant === 'olive' ? '#3A4A2E' : '#12291F'

  return (
    <div
      className="w-full overflow-hidden py-4 select-none"
      style={{ background: bg }}
      aria-hidden="true"
    >
      <div className="marquee-track">
        {ALL.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2.5 px-6 shrink-0 text-white"
          >
            {/* <item.icon size={14} strokeWidth={1.5} /> */}
            <span className="text-label whitespace-nowrap">{item.text}</span>
            <span className="ml-4 text-lg leading-none text-white/50">●</span>
          </span>
        ))}
      </div>
    </div>
  )
}
