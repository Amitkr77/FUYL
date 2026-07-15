import { Leaf, Zap, Shield, Heart, Brain, Sun } from "lucide-react";

const ITEMS = [
  { icon: Leaf, text: "Complete Daily Nutrition" },
  { icon: Zap, text: "Built With 60+ Premium Ingredients" },
  { icon: Shield, text: "Prebiotics + Probiotics + Digestive Enzymes" },
  { icon: Heart, text: "Gut Covered End To End" },
  { icon: Brain, text: "Vitamins & Minerals That Actually Absorb" },
  { icon: Sun, text: "3 Layers Of Antioxidant Protection" },
  { icon: Leaf, text: "Better Energy · Stronger Immunity · Built Daily" },
  { icon: Zap, text: "Only Daily With Liver Support Built In" },
  { icon: Shield, text: "Adaptogens That Target Your Stress" },
  { icon: Heart, text: "Real Berries · Real Colour · Nothing Artificial" },
  { icon: Brain, text: "100% Vegetarian · Nothing Hidden · No Shortcuts" },
  {
    icon: Sun,
    text: "Free ShippingTastes Like A Berry Drink · Works Like A Formula",
  },
  {
    icon: Sun,
    text: "Sweetened With Monk Fruit - Zero Calorie, Natural Sweetener",
  },
  { icon: Sun, text: "Free Shipping" },
];

const ALL = [...ITEMS, ...ITEMS];

export function MarqueeStrip() {
  return (
    <div
      className="w-full overflow-hidden py-4 select-none bg-white"
      aria-hidden="true"
    >
      <div className="marquee-track">
        {ALL.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2.5 px-6 shrink-0 text-brand-forest"
          >
            {/* <item.icon size={14} strokeWidth={1.5} /> */}
            <span className="text-label whitespace-nowrap">{item.text}</span>
            {/* A CSS-drawn dot, not the "●" glyph — that character's own font
                metrics sit above true center, so no font-size/line-height
                tweak on it lands exactly centered against the text row. */}
            <span className="ml-5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-forest" />
          </span>
        ))}
      </div>
    </div>
  );
}
