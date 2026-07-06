import Image from "next/image";
import Link from "next/link";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { IngredientsClient } from "@/components/content/IngredientsClient";
import type { IngredientData } from "@/components/content/IngredientCard";

export const metadata = generateSEO({
  title: "Ingredients",
  description:
    "Every ingredient in FUYL COMPLETE+ — 60+ premium, research-backed nutrients with transparent doses.",
  url: "https://fuyl.in/pages/ingredients",
});

const CATEGORIES = [
  "Adaptogens & Stress",
  "Probiotics & Gut",
  "Energy & Vitality",
  "Immunity & Antioxidants",
  "Liver & Detox",
  "Heart & Brain",
  "Bones & Joints",
  "Skin & Collagen",
];

const INGREDIENTS: IngredientData[] = [
  // Adaptogens
  {
    id: "ash",
    name: "KSM-66® Ashwagandha",
    amount: "300mg",
    benefit: "Stress, Cortisol & Hormones",
    description:
      "The world's most clinically studied ashwagandha extract. 22+ peer-reviewed studies demonstrate significant reductions in cortisol, perceived stress, anxiety and sleep latency. KSM-66 is a full-spectrum root extract with the highest concentration of withanolides available commercially.",
    emoji: "🌿",
    category: "Adaptogens & Stress",
    bg: "#F5F3FF",
    accent: "#7C3AED",
    clinical:
      "KSM-66 has been shown to reduce cortisol by up to 27.9% in double-blind, placebo-controlled trials (Chandrasekhar et al., 2012).",
  },
  {
    id: "bac",
    name: "Bacopa Monnieri",
    amount: "150mg",
    benefit: "Memory & Cognitive Function",
    description:
      "Used in Ayurveda for centuries, Bacopa is backed by modern research as a nootropic. It enhances memory formation, learning speed and reduces oxidative stress in neuronal tissue. Works synergistically with Ashwagandha for comprehensive cognitive support.",
    emoji: "🧠",
    category: "Adaptogens & Stress",
    bg: "#F5F3FF",
    accent: "#7C3AED",
  },
  // Probiotics & Gut
  {
    id: "bc",
    name: "Bacillus Coagulans",
    amount: "2 Billion CFU",
    benefit: "Gut Microbiome & Digestion",
    description:
      "Unlike most probiotics, Bacillus Coagulans forms heat-resistant spores that survive stomach acid and reach the intestine intact. Clinically proven to improve IBS symptoms, reduce bloating, and enhance immune response. A single strain that delivers more impact than many multi-strain products.",
    emoji: "🦠",
    category: "Probiotics & Gut",
    bg: "#F0FDF4",
    accent: "#22C55E",
    clinical:
      "Multiple RCTs demonstrate 60–70% improvement in IBS symptoms with Bacillus Coagulans supplementation.",
  },
  {
    id: "enz",
    name: "Digestive Enzyme Blend",
    amount: "100mg",
    benefit: "Nutrient Absorption & Bloating",
    description:
      "A comprehensive blend of Protease, Amylase, Lipase, Cellulase and Lactase. These enzymes break down proteins, carbohydrates, fats, plant fibre and dairy respectively — dramatically improving nutrient absorption from all food groups and reducing post-meal bloating.",
    emoji: "⚡",
    category: "Probiotics & Gut",
    bg: "#F0FDF4",
    accent: "#22C55E",
  },
  // Energy
  {
    id: "spi",
    name: "Spirulina",
    amount: "500mg",
    benefit: "Energy, Protein & Iron",
    description:
      "A blue-green algae that is gram-for-gram one of the most nutrient-dense foods on earth. Rich in complete protein (60–70% by weight), bioavailable iron, B-vitamins and phycocyanin — a powerful anti-inflammatory antioxidant. Spirulina provides clean, sustainable energy without stimulants.",
    emoji: "🌊",
    category: "Energy & Vitality",
    bg: "#F0FDF4",
    accent: "#22C55E",
  },
  {
    id: "mag",
    name: "Magnesium Glycinate",
    amount: "100mg",
    benefit: "Energy Production, Sleep & Recovery",
    description:
      "Magnesium is involved in over 300 enzymatic reactions — including ATP production (the body's energy currency). Glycinate is the most bioavailable and gentle form. Supports deep sleep, muscle recovery, insulin sensitivity and reduces anxiety. Most Indians are chronically deficient.",
    emoji: "💤",
    category: "Energy & Vitality",
    bg: "#FFFBEB",
    accent: "#F59E0B",
    clinical:
      "Magnesium supplementation significantly improves sleep quality in older adults (Abbasi et al., 2012, JRSM Open).",
  },
  {
    id: "b12",
    name: "Vitamin B12",
    amount: "2.5mcg",
    benefit: "Nerve Function & Energy Metabolism",
    description:
      "Essential for DNA synthesis, red blood cell formation and neurological function. Deficiency — extremely common in vegetarians and vegans — causes fatigue, nerve damage and cognitive decline. FUYL uses methylcobalamin, the active, directly usable form of B12.",
    emoji: "⚡",
    category: "Energy & Vitality",
    bg: "#FFFBEB",
    accent: "#F59E0B",
  },
  // Immunity
  {
    id: "aml",
    name: "Amla Extract",
    amount: "500mg",
    benefit: "Vitamin C & Immune Defence",
    description:
      "Indian Gooseberry (Amla) is one of nature's richest sources of Vitamin C — with unique tannin-bound forms that make it more stable and bioavailable than synthetic ascorbic acid. Supports collagen synthesis, iron absorption, immune defence and has potent antioxidant activity.",
    emoji: "🍃",
    category: "Immunity & Antioxidants",
    bg: "#EFF6FF",
    accent: "#3B82F6",
  },
  {
    id: "vd3",
    name: "Vitamin D3",
    amount: "1000 IU",
    benefit: "Immunity, Bones & Mood",
    description:
      "Cholecalciferol — the form produced by the skin from sunlight — is far more effective than D2. Over 80% of urban Indians are Vitamin D deficient due to indoor lifestyles and sun avoidance. D3 regulates immune response, calcium absorption, testosterone and serotonin production.",
    emoji: "☀️",
    category: "Immunity & Antioxidants",
    bg: "#EFF6FF",
    accent: "#3B82F6",
  },
  {
    id: "zn",
    name: "Zinc Picolinate",
    amount: "10mg",
    benefit: "Immunity, Testosterone & Wound Healing",
    description:
      "Zinc is essential for immune cell proliferation, testosterone synthesis and wound healing. Picolinate is the most absorbable chelated form. Deficiency is extremely common and linked to frequent infections, hair loss, poor wound healing and low testosterone in men.",
    emoji: "🛡️",
    category: "Immunity & Antioxidants",
    bg: "#EFF6FF",
    accent: "#3B82F6",
  },
  {
    id: "gse",
    name: "Grape Seed Extract",
    amount: "50mg",
    benefit: "Antioxidant & Circulation",
    description:
      "Contains oligomeric proanthocyanidins (OPCs) — some of the most potent antioxidants known. Protects blood vessels from oxidative damage, improves microcirculation, and synergises with Vitamin C to regenerate antioxidant capacity throughout the body.",
    emoji: "🍇",
    category: "Immunity & Antioxidants",
    bg: "#EFF6FF",
    accent: "#3B82F6",
  },
  // Liver
  {
    id: "mkt",
    name: "Milk Thistle",
    amount: "200mg (Silymarin)",
    benefit: "Liver Cell Regeneration",
    description:
      "Silymarin from Milk Thistle is the most extensively studied hepatoprotective compound in medicine. It protects liver cells from oxidative damage, promotes hepatocyte regeneration, and has demonstrated efficacy against alcohol-induced liver damage, fatty liver and hepatitis in clinical trials.",
    emoji: "🌸",
    category: "Liver & Detox",
    bg: "#ECFDF5",
    accent: "#10B981",
    clinical:
      "Silymarin demonstrates hepatoprotective effects in over 50 randomised controlled trials across multiple liver conditions.",
  },
  {
    id: "nac",
    name: "N-Acetyl Cysteine (NAC)",
    amount: "200mg",
    benefit: "Glutathione Production & Detox",
    description:
      "NAC is the precursor to glutathione — the body's master antioxidant and primary detoxification molecule. The liver uses glutathione to neutralise toxins, heavy metals and drug metabolites. NAC directly replenishes glutathione stores, supporting liver function and respiratory health.",
    emoji: "🧪",
    category: "Liver & Detox",
    bg: "#ECFDF5",
    accent: "#10B981",
  },
  {
    id: "cur",
    name: "Curcumin (Turmeric)",
    amount: "250mg",
    benefit: "Anti-Inflammation & Liver Protection",
    description:
      "Curcumin with piperine for enhanced bioavailability. A potent anti-inflammatory that inhibits NF-kB — the master regulator of inflammatory gene expression. Supports liver health, joint comfort, brain health and cardiovascular function simultaneously.",
    emoji: "🟡",
    category: "Liver & Detox",
    bg: "#ECFDF5",
    accent: "#10B981",
  },
  // Heart & Brain
  {
    id: "om3",
    name: "Omega-3 ALA (Flaxseed)",
    amount: "250mg",
    benefit: "Heart, Brain & Inflammation",
    description:
      "Alpha-linolenic acid from flaxseed provides plant-based Omega-3. The body converts ALA into EPA and DHA at modest rates. Combined with the anti-inflammatory effects of curcumin and grape seed extract, FUYL comprehensively supports cardiovascular and neurological health.",
    emoji: "🫀",
    category: "Heart & Brain",
    bg: "#EEF2FF",
    accent: "#6366F1",
  },
  {
    id: "coq",
    name: "Coenzyme Q10",
    amount: "30mg",
    benefit: "Cellular Energy & Heart Health",
    description:
      "CoQ10 is essential for mitochondrial energy production — every cell in the body depends on it. Levels naturally decline with age, particularly in heart muscle. CoQ10 supports cardiovascular function, reduces oxidative stress and works synergistically with Magnesium for optimal energy metabolism.",
    emoji: "❤️",
    category: "Heart & Brain",
    bg: "#EEF2FF",
    accent: "#6366F1",
  },
];

export default function IngredientsPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        {/* Right — Image */}
        <div className="relative min-h-[50vh] lg:min-h-0">
          <Image
            src="/images/fuyl-complete+.webp"
            alt="FUYL COMPLETE+ product"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* Left — Content */}
        <div className="bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <ScrollReveal>
            <Breadcrumbs className="mb-5" items={[{ label: 'Ingredients' }]} />
            <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label mb-5">
              Full Transparency
            </span>
            <h1 className="text-display-xl font-display text-brand-forest mb-6">
              60+ INGREDIENTS.
              <br />
              EVERY ONE EXPLAINED.
            </h1>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-lg">
              No proprietary blends. No hidden doses. Click any ingredient to
              understand exactly what it does, at what dose, and why it&apos;s
              in FUYL COMPLETE+.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Tabs + Card grid + Sidebar (client) ──────────── */}
      <IngredientsClient categories={CATEGORIES} ingredients={INGREDIENTS} />
    </>
  );
}
