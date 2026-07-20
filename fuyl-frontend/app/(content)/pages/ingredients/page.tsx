import Image from "next/image";
import { generateSEO } from "@/lib/utils/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { IngredientsClient } from "@/components/content/IngredientsClient";
import type { IngredientData } from "@/components/content/IngredientCard";

export const metadata = generateSEO({
  title: "Ingredients",
  description:
    "Every ingredient in FUYL COMPLETE+ — 48 premium, research-backed nutrients with transparent doses.",
  url: "https://fuyl.in/pages/ingredients",
});

const PHOTO = "/images/ingredients/ingredient-photos";

// ─── Categories (tab order) ──────────────────────────────────────────────────

const CATEGORIES = [
  "Antioxidants",
  "Cognitive Health & Adaptogens",
  "Detox",
  "Fruits & Berries",
  "Greens & Superfoods",
  "Gut Health",
  "Immunity",
  "Sweetener",
  "Vitamins & Minerals",
];

// Per-category colour + fallback emoji (used only if an image is missing)
const CAT_STYLE: Record<string, { bg: string; accent: string; emoji: string }> =
  {
    Antioxidants: { bg: "#FEF2F2", accent: "#E11D48", emoji: "🛡️" },
    "Cognitive Health & Adaptogens": {
      bg: "#F5F3FF",
      accent: "#7C3AED",
      emoji: "🧠",
    },
    Detox: { bg: "#ECFDF5", accent: "#10B981", emoji: "🌱" },
    "Fruits & Berries": { bg: "#FDF2F8", accent: "#DB2777", emoji: "🫐" },
    "Greens & Superfoods": { bg: "#F0FDF4", accent: "#22C55E", emoji: "🥬" },
    "Gut Health": { bg: "#F0FDFA", accent: "#14B8A6", emoji: "🦠" },
    Immunity: { bg: "#EFF6FF", accent: "#3B82F6", emoji: "🍃" },
    Sweetener: { bg: "#FEFCE8", accent: "#CA8A04", emoji: "🍯" },
    "Vitamins & Minerals": { bg: "#EEF2FF", accent: "#6366F1", emoji: "⚗️" },
  };

// ─── The 48 photographed ingredients ─────────────────────────────────────────
// Colours + fallback emoji come from the ingredient's category via CAT_STYLE.

type Seed = {
  id: string;
  name: string;
  benefit: string;
  description: string;
  category: string;
  file: string;
  amount?: string;
  clinical?: string;
};

const SEED: Seed[] = [
  // ── Antioxidants ──
  {
    id: "ala",
    name: "Alpha Lipoic Acid",
    benefit: "Nerve Health",
    description:
      "Both water- and fat-soluble antioxidant that regenerates other antioxidants and supports healthy nerve function.",
    category: "Antioxidants",
    file: "28-alpha-lipoic-acid.png",
  },
  {
    id: "gse",
    name: "Grape Seed Extract",
    benefit: "Circulation",
    description:
      "Rich in OPCs — powerful antioxidants supporting circulation, skin, and collagen synthesis.",
    category: "Antioxidants",
    file: "29-grape-seed.png",
  },
  {
    id: "asta",
    name: "Astaxanthin",
    benefit: "Skin & Eyes",
    description:
      "One of the most potent carotenoid antioxidants, supporting skin, eye, and cellular health.",
    category: "Antioxidants",
    file: "30-astaxanthin.png",
  },

  // ── Cognitive Health & Adaptogens ──
  {
    id: "ash",
    name: "Ashwagandha (KSM-66®)",
    benefit: "Stress & Sleep",
    description:
      "The most clinically studied ashwagandha — 22+ human trials show reduced cortisol and improved stress resilience, sleep, and strength.",
    category: "Cognitive Health & Adaptogens",
    file: "17-ashwagandha.png",
    clinical:
      "KSM-66 has been shown to reduce cortisol by up to 27.9% in double-blind, placebo-controlled trials (Chandrasekhar et al., 2012).",
  },
  {
    id: "brahmi",
    name: "Brahmi",
    benefit: "Focus & Memory",
    description:
      "Ayurvedic nootropic herb (Bacopa monnieri) supporting memory, focus, and calm under mental stress.",
    category: "Cognitive Health & Adaptogens",
    file: "18-brahmi.png",
  },
  {
    id: "tulsi",
    name: "Tulsi (Holy Basil)",
    benefit: "Anxiety Relief",
    description:
      "Reduces anxiety, supports blood sugar balance, and has natural antimicrobial properties.",
    category: "Cognitive Health & Adaptogens",
    file: "19-tulsi.png",
  },

  // ── Detox ──
  {
    id: "wheatgrass",
    name: "Wheatgrass",
    benefit: "Detox & Chlorophyll",
    description:
      "Chlorophyll-rich green shot supporting natural detoxification, alkalinity, and vitality.",
    category: "Detox",
    file: "03-wheatgrass.png",
  },
  {
    id: "milk-thistle",
    name: "Milk Thistle",
    benefit: "Liver Support",
    description:
      "Silymarin-rich herb that protects and supports healthy liver function and natural detoxification.",
    category: "Detox",
    file: "15-milk-thistle.png",
    clinical:
      "Silymarin demonstrates hepatoprotective effects across more than 50 randomised controlled trials.",
  },
  {
    id: "broccoli-sprout",
    name: "Broccoli Sprout",
    benefit: "Sulforaphane",
    description:
      "Concentrated source of sulforaphane supporting the body's detox pathways and cellular defence.",
    category: "Detox",
    file: "16-broccoli-sprout.png",
  },

  // ── Fruits & Berries ──
  {
    id: "blueberry",
    name: "Blueberry",
    benefit: "Brain & Skin",
    description:
      "Anthocyanin-rich berry protecting the brain and skin from oxidative stress and ageing.",
    category: "Fruits & Berries",
    file: "07-blueberry.png",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    benefit: "Vitamin C",
    description:
      "Vitamin-C-rich berry supporting immunity, collagen, and cellular protection.",
    category: "Fruits & Berries",
    file: "08-strawberry.png",
  },
  {
    id: "raspberry",
    name: "Raspberry",
    benefit: "Cellular Defence",
    description:
      "Loaded with ellagic acid and polyphenols that defend cells against free-radical damage.",
    category: "Fruits & Berries",
    file: "09-raspberry.png",
  },
  {
    id: "acai",
    name: "Acai Berry",
    benefit: "Longevity",
    description:
      "Amazonian superfruit with one of the highest antioxidant scores for cellular ageing support.",
    category: "Fruits & Berries",
    file: "10-acai-berry.png",
  },
  {
    id: "tart-cherry",
    name: "Tart Cherry",
    benefit: "Recovery & Sleep",
    description:
      "Natural source of melatonin and anthocyanins supporting muscle recovery and restful sleep.",
    category: "Fruits & Berries",
    file: "11-tart-cherry.png",
  },
  {
    id: "apple",
    name: "Apple",
    benefit: "Fibre & Polyphenols",
    description:
      "Rich in pectin fibre and quercetin, supporting gut health and steady energy.",
    category: "Fruits & Berries",
    file: "12-apple.png",
  },
  {
    id: "pineapple",
    name: "Pineapple",
    benefit: "Bromelain",
    description:
      "Source of bromelain — a natural enzyme with anti-inflammatory and protein-digesting properties.",
    category: "Fruits & Berries",
    file: "13-pineapple.png",
  },
  {
    id: "pomegranate",
    name: "Pomegranate",
    benefit: "Heart Health",
    description:
      "Punicalagin-rich fruit supporting cardiovascular health, circulation, and cellular protection.",
    category: "Fruits & Berries",
    file: "14-pomegranate.png",
  },

  // ── Greens & Superfoods ──
  {
    id: "spinach",
    name: "Spinach",
    benefit: "Iron & Folate",
    description:
      "Nutrient-dense leafy green rich in iron, folate, and vitamin K for energy and blood health.",
    category: "Greens & Superfoods",
    file: "01-spinach.png",
  },
  {
    id: "moringa",
    name: "Moringa Leaf",
    benefit: "Superfood",
    description:
      "India's native superfood packed with iron, calcium, and antioxidants for energy and immunity.",
    category: "Greens & Superfoods",
    file: "02-moringa.png",
  },
  {
    id: "beetroot",
    name: "Beetroot",
    benefit: "Stamina & Flow",
    description:
      "Natural source of nitrates that support blood flow, stamina, and exercise performance.",
    category: "Greens & Superfoods",
    file: "05-beetroot.png",
  },
  {
    id: "flaxseed",
    name: "Flaxseed",
    benefit: "Omega-3 (ALA)",
    description:
      "Plant-based omega-3 (ALA) and fibre supporting heart, brain, and hormonal balance.",
    category: "Greens & Superfoods",
    file: "06-flaxseed.png",
  },

  // ── Gut Health ──
  {
    id: "mint",
    name: "Mint",
    benefit: "Digestive Calm",
    description:
      "Cooling herb that soothes digestion, freshens breath, and eases bloating naturally.",
    category: "Gut Health",
    file: "04-mint.png",
  },
  {
    id: "phgg",
    name: "PHGG (Sunfiber®)",
    benefit: "Gut Regularity",
    description:
      "Clinically studied prebiotic fibre that supports regularity and feeds beneficial gut bacteria.",
    category: "Gut Health",
    file: "22-phgg-sunfiber.png",
  },
  {
    id: "fenugreek",
    name: "Fenugreek",
    benefit: "Blood Sugar",
    description:
      "Soluble-fibre-rich seed supporting healthy blood sugar balance and digestion.",
    category: "Gut Health",
    file: "23-fenugreek.png",
  },
  {
    id: "inulin",
    name: "Inulin",
    benefit: "Prebiotic",
    description:
      "Prebiotic fibre that nourishes gut flora and supports calcium absorption and satiety.",
    category: "Gut Health",
    file: "24-inulin.png",
  },
  {
    id: "fos",
    name: "FOS",
    benefit: "Gut Flora",
    description:
      "Fructo-oligosaccharides that selectively feed good bacteria for a balanced microbiome.",
    category: "Gut Health",
    file: "25-fos.png",
  },
  {
    id: "digezyme",
    name: "DigeZyme®",
    benefit: "Digestion",
    description:
      "Multi-enzyme blend breaking down carbs, protein, fat, and fibre to ease digestion and bloating.",
    category: "Gut Health",
    file: "26-digezyme.png",
  },
  {
    id: "bacillus",
    name: "Bacillus coagulans",
    benefit: "Gut Balance",
    description:
      "Heat-stable spore probiotic that survives digestion to support gut balance and immunity.",
    category: "Gut Health",
    file: "27-bacillus-coagulans.png",
    clinical:
      "Multiple RCTs demonstrate 60–70% improvement in IBS symptoms with Bacillus coagulans supplementation.",
  },

  // ── Immunity ──
  {
    id: "amla",
    name: "Amla",
    benefit: "Vitamin C",
    description:
      "One of nature's richest vitamin-C sources, supporting immunity, skin, and hair health.",
    category: "Immunity",
    file: "20-amla.png",
  },
  {
    id: "giloy",
    name: "Giloy",
    benefit: "Immunity",
    description:
      "Revered Ayurvedic herb supporting immune resilience and a healthy inflammatory response.",
    category: "Immunity",
    file: "21-giloy.png",
  },
  {
    id: "zinc",
    name: "Zinc",
    benefit: "Immunity",
    description:
      "Critical for immune function, wound healing, taste and smell, and testosterone production.",
    category: "Immunity",
    file: "32-zinc.png",
  },
  {
    id: "vitc",
    name: "Vitamin C",
    benefit: "Immunity",
    description:
      "Powerful antioxidant supporting immune function, collagen synthesis, and iron absorption.",
    category: "Immunity",
    file: "42-vitamin-c.png",
  },

  // ── Sweetener ──
  {
    id: "monkfruit",
    name: "Monk Fruit",
    benefit: "Zero-Cal Sweetness",
    description:
      "Natural zero-calorie sweetener that adds taste without spiking blood sugar.",
    category: "Sweetener",
    file: "36-monkfruit.png",
  },

  // ── Vitamins & Minerals ──
  {
    id: "iron",
    name: "Iron",
    benefit: "Energy",
    description:
      "Forms haemoglobin for oxygen transport. Deficiency is extremely common in India.",
    category: "Vitamins & Minerals",
    file: "31-iron.png",
  },
  {
    id: "selenium",
    name: "Selenium",
    benefit: "Thyroid Health",
    description:
      "Powerful antioxidant mineral supporting thyroid function and protecting against oxidative damage.",
    category: "Vitamins & Minerals",
    file: "33-selenium.png",
  },
  {
    id: "iodine",
    name: "Iodine",
    benefit: "Thyroid",
    description:
      "Essential for thyroid hormone synthesis. Supports metabolism, brain function, and growth.",
    category: "Vitamins & Minerals",
    file: "34-iodine.png",
  },
  {
    id: "manganese",
    name: "Manganese",
    benefit: "Metabolism",
    description:
      "Supports bone formation, blood clotting, and carbohydrate metabolism.",
    category: "Vitamins & Minerals",
    file: "35-manganese.png",
  },
  {
    id: "folate",
    name: "Vitamin B9 (Folate)",
    benefit: "Cell Division",
    description:
      "Critical for DNA synthesis and cell division, especially important for cellular regeneration.",
    category: "Vitamins & Minerals",
    file: "37-folate.png",
  },
  {
    id: "b12",
    name: "Vitamin B12 (Methylcobalamin)",
    benefit: "Nerve Health",
    description:
      "Active form of B12. Supports nerve function, red blood cells, and energy. Critical for Indians.",
    category: "Vitamins & Minerals",
    file: "38-vitamin-b12.png",
  },
  {
    id: "d3",
    name: "Vitamin D3 (Cholecalciferol)",
    benefit: "Bone & Mood",
    description:
      "Regulates calcium absorption and supports bone health, immunity, and mood. Critical for India.",
    category: "Vitamins & Minerals",
    file: "39-vitamin-d3.png",
  },
  {
    id: "k2",
    name: "Vitamin K2 (MK-7)",
    benefit: "Bone Health",
    description:
      "Directs calcium to bones, not arteries. Supports cardiovascular and bone health together.",
    category: "Vitamins & Minerals",
    file: "40-vitamin-k2.png",
  },
  {
    id: "magnesium",
    name: "Magnesium",
    benefit: "Sleep & Stress",
    description:
      "Involved in 300+ enzymatic reactions. Supports sleep quality, muscle relaxation, and energy.",
    category: "Vitamins & Minerals",
    file: "41-magnesium.png",
  },
  {
    id: "b1",
    name: "Vitamin B1 (Thiamine)",
    benefit: "Energy Metabolism",
    description:
      "Converts nutrients into energy. Critical for nerve function and glucose metabolism.",
    category: "Vitamins & Minerals",
    file: "43-vitamin-b1.png",
  },
  {
    id: "b2",
    name: "Vitamin B2 (Riboflavin)",
    benefit: "Cellular Energy",
    description:
      "Supports cellular energy production and protects cells from oxidative damage.",
    category: "Vitamins & Minerals",
    file: "44-vitamin-b2.png",
  },
  {
    id: "b3",
    name: "Vitamin B3 (Niacin)",
    benefit: "DNA Repair",
    description:
      "Essential for DNA repair, energy metabolism, and maintaining healthy cholesterol.",
    category: "Vitamins & Minerals",
    file: "45-vitamin-b3.png",
  },
  {
    id: "b5",
    name: "Vitamin B5 (Pantothenic Acid)",
    benefit: "Metabolic Support",
    description:
      "Synthesises coenzyme A — crucial for fat and carbohydrate metabolism.",
    category: "Vitamins & Minerals",
    file: "46-vitamin-b5.png",
  },
  {
    id: "b6",
    name: "Vitamin B6 (Pyridoxine)",
    benefit: "Brain Function",
    description:
      "100+ enzymes rely on B6. Critical for protein metabolism and neurotransmitter synthesis.",
    category: "Vitamins & Minerals",
    file: "47-vitamin-b6.png",
  },
  {
    id: "biotin",
    name: "Vitamin B7 (Biotin)",
    benefit: "Hair & Skin",
    description:
      "Supports hair, nail, and skin health while essential for fat and carbohydrate metabolism.",
    category: "Vitamins & Minerals",
    file: "48-biotin.png",
  },
];

const INGREDIENTS: IngredientData[] = SEED.map((s) => {
  const style = CAT_STYLE[s.category];
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    benefit: s.benefit,
    description: s.description,
    emoji: style.emoji,
    category: s.category,
    bg: style.bg,
    accent: style.accent,
    clinical: s.clinical,
    image: `${PHOTO}/${s.file}`,
  };
});

export default function IngredientsPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[60vh]">
        {/* Right — Image */}
        <div className="relative min-h-[50vh] lg:min-h-0">
          <Image
            src="/images/Ingredient-16-9.png"
            alt="Ingredients"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* Left — Content */}
        <div className="bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <ScrollReveal>
            <Breadcrumbs className="mb-5" items={[{ label: "Ingredients" }]} />
            {/* <span className="inline-block rounded-md px-3 py-2 bg-brand-sage text-brand-forest text-label mb-5">
              Full Transparency
            </span> */}
            <h1 className="text-display-xl font-display text-brand-forest mb-6">
              INGREDIENTS
            </h1>
            <p className="text-body-lg text-brand-muted leading-relaxed max-w-lg">
              Science behind the ingredients that make up the FUYL COMPLETE+
            </p>
            <button className="mt-10 inline-flex items-center justify-center h-12 px-10 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
              Explore Ingredients →
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Tabs + Card grid + Sidebar (client) ──────────── */}
      <IngredientsClient categories={CATEGORIES} ingredients={INGREDIENTS} />
    </>
  );
}
