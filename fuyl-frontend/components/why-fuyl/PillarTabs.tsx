"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Types ──────────────────────────────────────────────────────────────────

type Category =
  | "Vitamin"
  | "Mineral"
  | "Probiotic"
  | "Adaptogen"
  | "Antioxidant"
  | "Enzyme"
  | "Omega"
  | "Fiber"
  | "Superfood";

interface Ingredient {
  id: number;
  name: string;
  category: Category;
  description: string;
  benefit: string;
  image: string;
}

// ─── Category styling ────────────────────────────────────────────────────────
// Full class strings kept as literals so Tailwind's scanner picks them up

const CAT: Record<Category, { gradient: string; badge: string }> = {
  Vitamin: {
    gradient: "from-indigo-500 to-purple-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
  Mineral: {
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-100 text-amber-800",
  },
  Probiotic: {
    gradient: "from-emerald-500 to-green-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  Adaptogen: {
    gradient: "from-violet-500 to-purple-700",
    badge: "bg-violet-100 text-violet-700",
  },
  Antioxidant: {
    gradient: "from-brand-forest to-brand-olive",
    badge: "bg-brand-sage text-brand-forest",
  },
  Enzyme: {
    gradient: "from-teal-500 to-cyan-700",
    badge: "bg-teal-100 text-teal-700",
  },
  Omega: {
    gradient: "from-sky-500 to-blue-700",
    badge: "bg-sky-100 text-sky-700",
  },
  Fiber: {
    gradient: "from-yellow-500 to-amber-600",
    badge: "bg-yellow-100 text-yellow-800",
  },
  Superfood: {
    gradient: "from-lime-500 to-green-600",
    badge: "bg-lime-100 text-lime-800",
  },
};

// ─── 48 Premium Ingredients ──────────────────────────────────────────────────
// Each entry maps to a real product photo in
// /public/images/ingredients/ingredient-photos/

const IMG = "/images/ingredients/ingredient-photos";

const INGREDIENTS: Ingredient[] = [
  // Greens & Superfoods
  {
    id: 1,
    name: "Spinach",
    category: "Superfood",
    benefit: "Iron & Folate",
    description:
      "Nutrient-dense leafy green rich in iron, folate, and vitamin K for energy and blood health.",
    image: `${IMG}/01-spinach.png`,
  },
  {
    id: 2,
    name: "Moringa Leaf",
    category: "Superfood",
    benefit: "Superfood",
    description:
      "India's native superfood packed with iron, calcium, and antioxidants for energy and immunity.",
    image: `${IMG}/02-moringa.png`,
  },
  {
    id: 3,
    name: "Wheatgrass",
    category: "Superfood",
    benefit: "Detox & Chlorophyll",
    description:
      "Chlorophyll-rich green shot supporting natural detoxification, alkalinity, and vitality.",
    image: `${IMG}/03-wheatgrass.png`,
  },
  {
    id: 4,
    name: "Mint",
    category: "Superfood",
    benefit: "Digestive Calm",
    description:
      "Cooling herb that soothes digestion, freshens breath, and eases bloating naturally.",
    image: `${IMG}/04-mint.png`,
  },
  {
    id: 5,
    name: "Beetroot",
    category: "Superfood",
    benefit: "Stamina & Flow",
    description:
      "Natural source of nitrates that support blood flow, stamina, and exercise performance.",
    image: `${IMG}/05-beetroot.png`,
  },
  {
    id: 6,
    name: "Flaxseed",
    category: "Omega",
    benefit: "Omega-3 (ALA)",
    description:
      "Plant-based omega-3 (ALA) and fibre supporting heart, brain, and hormonal balance.",
    image: `${IMG}/06-flaxseed.png`,
  },
  // Berries & Fruit Antioxidants
  {
    id: 7,
    name: "Blueberry",
    category: "Antioxidant",
    benefit: "Brain & Skin",
    description:
      "Anthocyanin-rich berry protecting the brain and skin from oxidative stress and ageing.",
    image: `${IMG}/07-blueberry.png`,
  },
  {
    id: 8,
    name: "Strawberry",
    category: "Antioxidant",
    benefit: "Vitamin C",
    description:
      "Vitamin-C-rich berry supporting immunity, collagen, and cellular protection.",
    image: `${IMG}/08-strawberry.png`,
  },
  {
    id: 9,
    name: "Raspberry",
    category: "Antioxidant",
    benefit: "Cellular Defence",
    description:
      "Loaded with ellagic acid and polyphenols that defend cells against free-radical damage.",
    image: `${IMG}/09-raspberry.png`,
  },
  {
    id: 10,
    name: "Acai Berry",
    category: "Antioxidant",
    benefit: "Longevity",
    description:
      "Amazonian superfruit with one of the highest antioxidant scores for cellular ageing support.",
    image: `${IMG}/10-acai-berry.png`,
  },
  {
    id: 11,
    name: "Tart Cherry",
    category: "Antioxidant",
    benefit: "Recovery & Sleep",
    description:
      "Natural source of melatonin and anthocyanins supporting muscle recovery and restful sleep.",
    image: `${IMG}/11-tart-cherry.png`,
  },
  {
    id: 12,
    name: "Apple",
    category: "Superfood",
    benefit: "Fibre & Polyphenols",
    description:
      "Rich in pectin fibre and quercetin, supporting gut health and steady energy.",
    image: `${IMG}/12-apple.png`,
  },
  {
    id: 13,
    name: "Pineapple",
    category: "Enzyme",
    benefit: "Bromelain",
    description:
      "Source of bromelain — a natural enzyme with anti-inflammatory and protein-digesting properties.",
    image: `${IMG}/13-pineapple.png`,
  },
  {
    id: 14,
    name: "Pomegranate",
    category: "Antioxidant",
    benefit: "Heart Health",
    description:
      "Punicalagin-rich fruit supporting cardiovascular health, circulation, and cellular protection.",
    image: `${IMG}/14-pomegranate.png`,
  },
  {
    id: 15,
    name: "Milk Thistle",
    category: "Antioxidant",
    benefit: "Liver Support",
    description:
      "Silymarin-rich herb that protects and supports healthy liver function and detoxification.",
    image: `${IMG}/15-milk-thistle.png`,
  },
  {
    id: 16,
    name: "Broccoli Sprout",
    category: "Antioxidant",
    benefit: "Sulforaphane",
    description:
      "Concentrated source of sulforaphane supporting detox pathways and cellular defence.",
    image: `${IMG}/16-broccoli-sprout.png`,
  },
  // Ayurvedic Adaptogens
  {
    id: 17,
    name: "Ashwagandha (KSM-66®)",
    category: "Adaptogen",
    benefit: "Stress & Sleep",
    description:
      "22+ clinical studies. Reduces cortisol, improves stress resilience, sleep, and strength.",
    image: `${IMG}/17-ashwagandha.png`,
  },
  {
    id: 18,
    name: "Brahmi",
    category: "Adaptogen",
    benefit: "Focus & Memory",
    description:
      "Ayurvedic nootropic herb supporting memory, focus, and calm under mental stress.",
    image: `${IMG}/18-brahmi.png`,
  },
  {
    id: 19,
    name: "Tulsi (Holy Basil)",
    category: "Adaptogen",
    benefit: "Anxiety Relief",
    description:
      "Reduces anxiety, supports blood sugar balance, and has antimicrobial properties.",
    image: `${IMG}/19-tulsi.png`,
  },
  {
    id: 20,
    name: "Amla",
    category: "Antioxidant",
    benefit: "Vitamin C",
    description:
      "One of nature's richest vitamin-C sources, supporting immunity, skin, and hair health.",
    image: `${IMG}/20-amla.png`,
  },
  {
    id: 21,
    name: "Giloy",
    category: "Adaptogen",
    benefit: "Immunity",
    description:
      "Revered Ayurvedic herb supporting immune resilience and healthy inflammatory response.",
    image: `${IMG}/21-giloy.png`,
  },
  // Fibre & Prebiotics
  {
    id: 22,
    name: "PHGG (Sunfiber®)",
    category: "Fiber",
    benefit: "Gut Regularity",
    description:
      "Clinically studied prebiotic fibre that supports regularity and feeds beneficial gut bacteria.",
    image: `${IMG}/22-phgg-sunfiber.png`,
  },
  {
    id: 23,
    name: "Fenugreek",
    category: "Fiber",
    benefit: "Blood Sugar",
    description:
      "Soluble-fibre-rich seed supporting healthy blood sugar balance and digestion.",
    image: `${IMG}/23-fenugreek.png`,
  },
  {
    id: 24,
    name: "Inulin",
    category: "Fiber",
    benefit: "Prebiotic",
    description:
      "Prebiotic fibre that nourishes gut flora and supports calcium absorption and satiety.",
    image: `${IMG}/24-inulin.png`,
  },
  {
    id: 25,
    name: "FOS",
    category: "Fiber",
    benefit: "Gut Flora",
    description:
      "Fructo-oligosaccharides that selectively feed good bacteria for a balanced microbiome.",
    image: `${IMG}/25-fos.png`,
  },
  // Enzymes & Probiotics
  {
    id: 26,
    name: "DigeZyme®",
    category: "Enzyme",
    benefit: "Digestion",
    description:
      "Multi-enzyme blend breaking down carbs, protein, fat, and fibre to ease digestion and bloating.",
    image: `${IMG}/26-digezyme.png`,
  },
  {
    id: 27,
    name: "Bacillus coagulans",
    category: "Probiotic",
    benefit: "Gut Balance",
    description:
      "Heat-stable spore probiotic that survives digestion to support gut balance and immunity.",
    image: `${IMG}/27-bacillus-coagulans.png`,
  },
  // Antioxidant Actives
  {
    id: 28,
    name: "Alpha Lipoic Acid",
    category: "Antioxidant",
    benefit: "Nerve Health",
    description:
      "Both water and fat-soluble antioxidant. Regenerates other antioxidants and supports nerves.",
    image: `${IMG}/28-alpha-lipoic-acid.png`,
  },
  {
    id: 29,
    name: "Grape Seed Extract",
    category: "Antioxidant",
    benefit: "Circulation",
    description:
      "Rich in OPCs — powerful antioxidants supporting circulation, skin, and collagen synthesis.",
    image: `${IMG}/29-grape-seed.png`,
  },
  {
    id: 30,
    name: "Astaxanthin",
    category: "Antioxidant",
    benefit: "Skin & Eyes",
    description:
      "One of the most potent carotenoid antioxidants, supporting skin, eye, and cellular health.",
    image: `${IMG}/30-astaxanthin.png`,
  },
  // Minerals
  {
    id: 31,
    name: "Iron",
    category: "Mineral",
    benefit: "Energy",
    description:
      "Forms haemoglobin for oxygen transport. Deficiency is extremely common in India.",
    image: `${IMG}/31-iron.png`,
  },
  {
    id: 32,
    name: "Zinc",
    category: "Mineral",
    benefit: "Immunity",
    description:
      "Critical for immune function, wound healing, taste and smell, and testosterone production.",
    image: `${IMG}/32-zinc.png`,
  },
  {
    id: 33,
    name: "Selenium",
    category: "Mineral",
    benefit: "Thyroid Health",
    description:
      "Powerful antioxidant mineral supporting thyroid function and protecting against oxidative damage.",
    image: `${IMG}/33-selenium.png`,
  },
  {
    id: 34,
    name: "Iodine",
    category: "Mineral",
    benefit: "Thyroid",
    description:
      "Essential for thyroid hormone synthesis. Supports metabolism, brain function, and growth.",
    image: `${IMG}/34-iodine.png`,
  },
  {
    id: 35,
    name: "Manganese",
    category: "Mineral",
    benefit: "Metabolism",
    description:
      "Supports bone formation, blood clotting, and carbohydrate metabolism.",
    image: `${IMG}/35-manganese.png`,
  },
  {
    id: 36,
    name: "Monk Fruit",
    category: "Superfood",
    benefit: "Zero-Cal Sweetness",
    description:
      "Natural zero-calorie sweetener that adds taste without spiking blood sugar.",
    image: `${IMG}/36-monkfruit.png`,
  },
  // Vitamins
  {
    id: 37,
    name: "Vitamin B9 (Folate)",
    category: "Vitamin",
    benefit: "Cell Division",
    description:
      "Critical for DNA synthesis and cell division, especially important for cellular regeneration.",
    image: `${IMG}/37-folate.png`,
  },
  {
    id: 38,
    name: "Vitamin B12 (Methylcobalamin)",
    category: "Vitamin",
    benefit: "Nerve Health",
    description:
      "Active form of B12. Supports nerve function, red blood cells, and energy. Critical for Indians.",
    image: `${IMG}/38-vitamin-b12.png`,
  },
  {
    id: 39,
    name: "Vitamin D3 (Cholecalciferol)",
    category: "Vitamin",
    benefit: "Bone & Mood",
    description:
      "Regulates calcium absorption and supports bone health, immunity, and mood. Critical for India.",
    image: `${IMG}/39-vitamin-d3.png`,
  },
  {
    id: 40,
    name: "Vitamin K2 (MK-7)",
    category: "Vitamin",
    benefit: "Bone Health",
    description:
      "Directs calcium to bones, not arteries. Supports cardiovascular and bone health together.",
    image: `${IMG}/40-vitamin-k2.png`,
  },
  {
    id: 41,
    name: "Magnesium",
    category: "Mineral",
    benefit: "Sleep & Stress",
    description:
      "Involved in 300+ enzymatic reactions. Supports sleep quality, muscle relaxation, and energy.",
    image: `${IMG}/41-magnesium.png`,
  },
  {
    id: 42,
    name: "Vitamin C",
    category: "Vitamin",
    benefit: "Immunity",
    description:
      "Powerful antioxidant supporting immune function, collagen synthesis, and iron absorption.",
    image: `${IMG}/42-vitamin-c.png`,
  },
  {
    id: 43,
    name: "Vitamin B1 (Thiamine)",
    category: "Vitamin",
    benefit: "Energy Metabolism",
    description:
      "Converts nutrients into energy. Critical for nerve function and glucose metabolism.",
    image: `${IMG}/43-vitamin-b1.png`,
  },
  {
    id: 44,
    name: "Vitamin B2 (Riboflavin)",
    category: "Vitamin",
    benefit: "Cellular Energy",
    description:
      "Supports cellular energy production and protects cells from oxidative damage.",
    image: `${IMG}/44-vitamin-b2.png`,
  },
  {
    id: 45,
    name: "Vitamin B3 (Niacin)",
    category: "Vitamin",
    benefit: "DNA Repair",
    description:
      "Essential for DNA repair, energy metabolism, and maintaining healthy cholesterol.",
    image: `${IMG}/45-vitamin-b3.png`,
  },
  {
    id: 46,
    name: "Vitamin B5 (Pantothenic Acid)",
    category: "Vitamin",
    benefit: "Metabolic Support",
    description:
      "Synthesises coenzyme A — crucial for fat and carbohydrate metabolism.",
    image: `${IMG}/46-vitamin-b5.png`,
  },
  {
    id: 47,
    name: "Vitamin B6 (Pyridoxine)",
    category: "Vitamin",
    benefit: "Brain Function",
    description:
      "100+ enzymes rely on B6. Critical for protein metabolism and neurotransmitter synthesis.",
    image: `${IMG}/47-vitamin-b6.png`,
  },
  {
    id: 48,
    name: "Vitamin B7 (Biotin)",
    category: "Vitamin",
    benefit: "Hair & Skin",
    description:
      "Supports hair, nail, and skin health while essential for fat and carbohydrate metabolism.",
    image: `${IMG}/48-biotin.png`,
  },
];

// ─── Tab 2: Research-informed dosing cards ──────────────────────────────────

const CLINICAL_CARDS = [
  {
    emoji: "🌿",
    stat: "600mg",
    title: "KSM-66® Ashwagandha",
    image: "/images/ingredients/tab2-research-dosing/ksm-66.png",
    body: "The most clinically studied ashwagandha, dosed at the 600mg used across 22+ human trials for stress, sleep, and strength.",
  },
  {
    emoji: "🔴",
    stat: "4mg",
    title: "Astaxanthin",
    image: "/images/ingredients/tab2-research-dosing/astaxanthin.png",
    body: "One of nature's most potent antioxidants, dosed at the research-backed level shown to support skin, eye, and cellular health.",
  },
  {
    emoji: "🍇",
    stat: "150mg",
    title: "Grape Seed Extract",
    image: "/images/ingredients/tab2-research-dosing/grape-seed-extract.png",
    body: "Standardised to OPC polyphenols at a studied dose supporting circulation, skin, and antioxidant defence.",
  },
  {
    emoji: "🦠",
    stat: "2B CFU",
    title: "Bacillus coagulans",
    image: "/images/ingredients/tab2-research-dosing/bacillus-coagulans.png",
    body: "A heat-stable spore probiotic dosed to survive stomach acid and reach the gut, supporting digestion and immunity.",
  },
  {
    emoji: "🌱",
    stat: "150mg",
    title: "Milk Thistle",
    image: "/images/ingredients/tab2-research-dosing/milk-thistle.png",
    body: "Standardised to silymarin at a studied dose that supports healthy liver function and natural detoxification.",
  },
  {
    emoji: "🌾",
    stat: "5g",
    title: "Sunfiber® (PHGG)",
    image: "/images/ingredients/tab2-research-dosing/sunfiber-phgg.png",
    body: "A clinically studied prebiotic fibre dose that supports regularity and feeds a balanced gut microbiome.",
  },
];

// ─── Tab 3: Better-absorption cards ─────────────────────────────────────────

const INDIAN_CARDS = [
  {
    stat: "3×",
    title: "Iron Bisglycinate",
    source: "Chelated Form",
    image: "/images/ingredients/tab3-absorption/iron.png",
    body: "Gentle chelated iron absorbed far better than cheap iron salts — and paired with Vitamin C to maximise uptake without the stomach upset.",
  },
  {
    stat: "+67%",
    title: "Vitamin C",
    source: "Absorption Booster",
    image: "/images/ingredients/tab3-absorption/vitamin-c.png",
    body: "More than immunity — Vitamin C converts iron into its absorbable form, dramatically increasing how much your body actually takes up.",
  },
  {
    stat: "4×",
    title: "Magnesium Glycinate",
    source: "Chelated Form",
    image: "/images/ingredients/tab3-absorption/magnesium.png",
    body: "The glycinate form is absorbed far more efficiently than oxide and is gentle on the gut, so magnesium reaches muscles and nerves where it counts.",
  },
  {
    stat: "MK-7",
    title: "Vitamin K2",
    source: "Long-Acting",
    image: "/images/ingredients/tab3-absorption/vitamin-k2.png",
    body: "The MK-7 form stays active in the bloodstream far longer, directing calcium into bones and away from arteries.",
  },
  {
    stat: "~90%",
    title: "Selenium",
    source: "Selenomethionine",
    image: "/images/ingredients/tab3-absorption/selenium.png",
    body: "The organic selenomethionine form is absorbed near-completely, supporting thyroid function and antioxidant defence.",
  },
  {
    stat: "Low-FODMAP",
    title: "Sunfiber® (PHGG)",
    source: "Prebiotic Fibre",
    image: "/images/ingredients/tab3-absorption/sunfiber-phgg.png",
    body: "A gentle prebiotic fibre that feeds good bacteria and improves nutrient uptake in the gut — without the bloating of harsher fibres.",
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const PILLARS = [
  {
    n: "01",
    title: "60+ Premium Ingredients",
    image: "/images/ingredients/first-tab.webp",
    accentLight: "#D4688A",
  },
  {
    n: "02",
    title: "Research Informed Dosing",
    image: "/images/ingredients/second-tab.webp",
    accentLight: "#4ADE80",
  },
  {
    n: "03",
    title: "Better Absorption Where It Matters",
    image: "/images/ingredients/third-tab.webp",
    accentLight: "#FCD34D",
  },
  {
    n: "04",
    title: "Good Science Great Taste",
    image: "/images/ingredients/fourth-tab.webp",
    accentLight: "#60A5FA",
  },
];

// ─── Flip card ────────────────────────────────────────────────────────────────

function FlipCard({
  ingredient,
  isFlipped,
  onFlip,
}: {
  ingredient: Ingredient;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  const cat = CAT[ingredient.category];

  return (
    <div
      className="aspect-4/4 cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label={`${ingredient.name} — click to reveal`}
      onKeyDown={(e) => e.key === "Enter" && onFlip()}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={ingredient.image}
              alt={ingredient.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full bg-brand-forest backdrop-blur">
              <Eye className="h-4 w-4 text-white" />
            </div>

            {/* <h3 className="text-lg font-bold leading-tight text-black drop-shadow-lg sm:text-xl md:text-xl">
              {ingredient.name}
            </h3> */}
          </div>
        </div>

        {/* Back */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-lg"
        >
          <div className="mb-3 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full bg-neutral-100">
            <EyeOff className="h-4 w-4 text-neutral-500" />
          </div>

          <h3 className="mb-3 text-base font-bold leading-tight text-neutral-900 sm:text-lg">
            {ingredient.name}
          </h3>

          <p className="flex-1 text-sm leading-6 text-neutral-600 sm:text-base">
            {ingredient.description}
          </p>

          <span
            className={cn(
              "mt-4 self-start rounded-full px-3 py-1 text-xs sm:text-sm font-semibold",
              cat.badge,
            )}
          >
            {ingredient.benefit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: 60-ingredient grid ───────────────────────────────────────────────

function IngredientGrid() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-5">
      {/* Legend + count */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="ml-auto rounded-full bg-gray-100 px-3 py-0.5 text-[10px] font-medium text-gray-500">
          {INGREDIENTS.length} ingredients · tap to reveal
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4  sm:gap-3 lg:gap-4">
        {INGREDIENTS.map((ing) => (
          <FlipCard
            key={ing.id}
            ingredient={ing}
            isFlipped={flipped.has(ing.id)}
            onFlip={() => toggle(ing.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Tab 2: Clinical cards (2 × 3) — content LEFT, image RIGHT ──────────────
// Uses flex-row-reverse on desktop so image stays right while DOM order keeps
// image first (so mobile still shows image on top naturally).

function ClinicalGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {CLINICAL_CARDS.map((card, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition-shadow hover:shadow-lg lg:flex-row-reverse"
        >
          {/* Image — full-width top on mobile/tablet, right on lg+ */}
          <div className="relative h-72 sm:h-80 lg:h-72 shrink-0 lg:w-6/12">
            {/* <span className="absolute bottom-3 left-3 rounded-full bg-brand-teal px-3 py-1 text-xs font-bold text-white shadow-md">
              {card.stat}
            </span> */}
            <Image
              src={card.image}
              alt={card.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 30vw"
            />
            {/* <div className="absolute inset-0 bg-black/20" /> */}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-8">
            {/* <span className="text-3xl">{card.emoji}</span> */}
            <div className="flex flex-col gap-2">
              <p className="text-body-lg font-bold text-brand-forest">
                {card.title}
              </p>
              <p className="text-body-sm leading-relaxed text-brand-muted">
                {card.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 3: Indian-body cards (2 × 3) — image LEFT, content RIGHT ───────────
// Plain flex-row on desktop, same DOM order as mobile (image first), so image
// stays left at every breakpoint. Sized to match ClinicalGrid's cards.

function IndianGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {INDIAN_CARDS.map((card, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition-shadow hover:shadow-lg lg:flex-row"
        >
          {/* Image — full-width top on mobile/tablet, left on lg+ */}
          <div className="relative h-72 sm:h-80 lg:h-72 shrink-0 lg:w-6/12">
            <Image
              src={card.image}
              alt={card.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 30vw"
            />
            <div className="absolute inset-0 bg-black/20" />
            {/* <span className="absolute bottom-3 right-3 rounded-full bg-brand-forest px-3 py-1 text-[10px] font-bold text-white shadow-md">
              {card.source}
            </span> */}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-8">
            {/* <span className="font-display text-display-lg leading-none text-brand-teal">
              {card.stat}
            </span> */}
            <div className="flex flex-col gap-2">
              <p className="text-body-lg font-bold text-brand-forest">
                {card.title}
              </p>
              <p className="text-body-sm leading-relaxed text-brand-muted">
                {card.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 4: Single taste card — image LEFT, content RIGHT ────────────────────

function ManufacturingCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-lg lg:flex">
      {/* Image panel — left on desktop, top on mobile */}
      <div className="relative h-64 shrink-0 lg:h-160 lg:w-6/12">
        <Image
          src="/images/ingredients/tab4-taste/taste-you-look-forward.png"
          alt="A daily dose you actually look forward to"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 42vw"
        />
      </div>

      {/* Content panel — right on desktop, below on mobile — heading + paragraph, vertically centered */}
      <div className="flex flex-1 flex-col justify-center gap-3 p-8 sm:p-10 lg:w-7/12">
        <p className="text-label tracking-widest text-brand-teal">
          Formulated For Flavour
        </p>
        <h3 className="font-display text-display-lg leading-tight text-brand-forest">
          GOOD SCIENCE,
          <br />
          GREAT TASTE.
        </h3>
        <p className="mt-1 text-body-md leading-relaxed text-brand-muted">
          60+ clinically-informed ingredients shouldn&apos;t taste like a
          compromise. Naturally sweetened with Monk Fruit and real fruit
          extracts — a daily dose you actually look forward to.
        </p>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PillarTabs() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [displayed, setDisplayed] = useState(0);

  const switchTab = (i: number) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(i);
      setDisplayed(i);
      setFading(false);
    }, 180);
  };

  const tabContent = [
    <IngredientGrid key="ingredients" />,
    <ClinicalGrid key="clinical" />,
    <IndianGrid key="indian" />,
    <ManufacturingCard key="manufacturing" />,
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* ── Tab strip — horizontal scroll on mobile ──────────── */}
      <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4 pb-2 sm:gap-5 lg:grid lg:grid-cols-4 lg:gap-6 lg:p-4">
          {PILLARS.map((p, i) => (
            <button
              key={p.n}
              type="button"
              onClick={() => switchTab(i)}
              className={cn(
                "group relative h-64 w-64 shrink-0 overflow-hidden rounded-3xl border transition-all duration-300",
                "sm:h-72 sm:w-72",
                "lg:h-96 lg:w-auto",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2",
                active === i
                  ? "scale-[1.02] border-brand-teal shadow-2xl"
                  : "border-brand-border hover:-translate-y-1 hover:shadow-xl",
              )}
            >
              {/* Background Image */}
              <img
                src={p.image}
                alt={p.title}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-transform duration-700",
                  active === i ? "scale-110" : "group-hover:scale-105",
                )}
              />

              {/* Overlay */}
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-300",
                  active === i
                    ? "bg-linear-to-t from-brand-forest via-brand-forest/50 to-transparent"
                    : "bg-linear-to-t from-black/70 via-black/30 to-transparent group-hover:from-black/60",
                )}
              />

              {/* Content */}
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <span
                  className={cn(
                    "w-fit rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] backdrop-blur-md",
                    active === i
                      ? "bg-brand-teal/20 text-brand-teal"
                      : "bg-white/15 text-white",
                  )}
                >
                  {p.n}
                </span>

                <div>
                  <h3
                    className={cn(
                      "text-xl font-bold leading-tight transition-all duration-300 sm:text-2xl",
                      active === i
                        ? "text-white tracking-tight"
                        : "text-white/70 group-hover:text-white",
                    )}
                  >
                    {p.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-2">
                    {active === i && (
                      <>
                        <div className="h-1 w-10 rounded-full bg-brand-teal transition-all duration-300" />
                        <span className="text-xs font-medium tracking-wider text-brand-teal">
                          Active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 0.18s ease",
        }}
      >
        {tabContent[displayed]}
      </div>
    </div>
  );
}
