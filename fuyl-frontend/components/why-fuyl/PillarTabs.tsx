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
  | "Superfood";

interface Ingredient {
  id: number;
  name: string;
  category: Category;
  description: string;
  benefit: string;
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
  Superfood: {
    gradient: "from-lime-500 to-green-600",
    badge: "bg-lime-100 text-lime-800",
  },
};

// ─── 60 Ingredients ─────────────────────────────────────────────────────────

const INGREDIENTS: Ingredient[] = [
  // Vitamins — 12
  {
    id: 1,
    name: "Vitamin B1 (Thiamine)",
    category: "Vitamin",
    benefit: "Energy Metabolism",
    description:
      "Converts nutrients into energy. Critical for nerve function and glucose metabolism.",
  },
  {
    id: 2,
    name: "Vitamin B2 (Riboflavin)",
    category: "Vitamin",
    benefit: "Cellular Energy",
    description:
      "Supports cellular energy production and protects cells from oxidative damage.",
  },
  {
    id: 3,
    name: "Vitamin B3 (Niacin)",
    category: "Vitamin",
    benefit: "DNA Repair",
    description:
      "Essential for DNA repair, energy metabolism, and maintaining healthy cholesterol.",
  },
  {
    id: 4,
    name: "Vitamin B5 (Pantothenic Acid)",
    category: "Vitamin",
    benefit: "Metabolic Support",
    description:
      "Synthesises coenzyme A — crucial for fat and carbohydrate metabolism.",
  },
  {
    id: 5,
    name: "Vitamin B6 (Pyridoxine)",
    category: "Vitamin",
    benefit: "Brain Function",
    description:
      "100+ enzymes rely on B6. Critical for protein metabolism and neurotransmitter synthesis.",
  },
  {
    id: 6,
    name: "Vitamin B7 (Biotin)",
    category: "Vitamin",
    benefit: "Hair & Skin",
    description:
      "Supports hair, nail, and skin health while essential for fat and carbohydrate metabolism.",
  },
  {
    id: 7,
    name: "Vitamin B9 (Folate)",
    category: "Vitamin",
    benefit: "Cell Division",
    description:
      "Critical for DNA synthesis and cell division, especially important for cellular regeneration.",
  },
  {
    id: 8,
    name: "Vitamin B12 (Methylcobalamin)",
    category: "Vitamin",
    benefit: "Nerve Health",
    description:
      "Active form of B12. Supports nerve function, red blood cells, and energy. Critical for Indians.",
  },
  {
    id: 9,
    name: "Vitamin C",
    category: "Vitamin",
    benefit: "Immunity",
    description:
      "Powerful antioxidant supporting immune function, collagen synthesis, and iron absorption.",
  },
  {
    id: 10,
    name: "Vitamin D3 (Cholecalciferol)",
    category: "Vitamin",
    benefit: "Bone & Mood",
    description:
      "Regulates calcium absorption and supports bone health, immunity, and mood. Critical for India.",
  },
  {
    id: 11,
    name: "Vitamin E (Tocopherol)",
    category: "Vitamin",
    benefit: "Antioxidant",
    description:
      "Fat-soluble antioxidant protecting cell membranes, immune function, and skin.",
  },
  {
    id: 12,
    name: "Vitamin K2 (MK-7)",
    category: "Vitamin",
    benefit: "Bone Health",
    description:
      "Directs calcium to bones, not arteries. Supports cardiovascular and bone health together.",
  },
  // Minerals — 11
  {
    id: 13,
    name: "Calcium",
    category: "Mineral",
    benefit: "Bone Strength",
    description:
      "Essential for bone structure, muscle contraction, nerve signalling, and blood clotting.",
  },
  {
    id: 14,
    name: "Magnesium",
    category: "Mineral",
    benefit: "Sleep & Stress",
    description:
      "Involved in 300+ enzymatic reactions. Supports sleep quality, muscle relaxation, and energy.",
  },
  {
    id: 15,
    name: "Zinc",
    category: "Mineral",
    benefit: "Immunity",
    description:
      "Critical for immune function, wound healing, taste and smell, and testosterone production.",
  },
  {
    id: 16,
    name: "Iron",
    category: "Mineral",
    benefit: "Energy",
    description:
      "Forms haemoglobin for oxygen transport. Deficiency is extremely common in India.",
  },
  {
    id: 17,
    name: "Selenium",
    category: "Mineral",
    benefit: "Thyroid Health",
    description:
      "Powerful antioxidant mineral supporting thyroid function and protecting against oxidative damage.",
  },
  {
    id: 18,
    name: "Chromium (Chromax®)",
    category: "Mineral",
    benefit: "Blood Sugar",
    description:
      "Patented chromium picolinate. Enhances insulin sensitivity and supports blood glucose balance.",
  },
  {
    id: 19,
    name: "Iodine",
    category: "Mineral",
    benefit: "Thyroid",
    description:
      "Essential for thyroid hormone synthesis. Supports metabolism, brain function, and growth.",
  },
  {
    id: 20,
    name: "Manganese",
    category: "Mineral",
    benefit: "Metabolism",
    description:
      "Supports bone formation, blood clotting, and carbohydrate metabolism.",
  },
  {
    id: 21,
    name: "Copper",
    category: "Mineral",
    benefit: "Iron Metabolism",
    description:
      "Supports iron metabolism, connective tissue formation, and neurological function.",
  },
  {
    id: 22,
    name: "Potassium",
    category: "Mineral",
    benefit: "Heart Health",
    description:
      "Regulates fluid balance, nerve signals, and muscle contractions including the heart.",
  },
  {
    id: 23,
    name: "Phosphorus",
    category: "Mineral",
    benefit: "Energy Storage",
    description:
      "Second most abundant mineral in the body. Supports bone structure and energy storage (ATP).",
  },
  // Probiotics — 8
  {
    id: 24,
    name: "L. acidophilus",
    category: "Probiotic",
    benefit: "Gut Health",
    description:
      "Most studied probiotic strain. Supports digestion, lactose tolerance, and immune balance.",
  },
  {
    id: 25,
    name: "L. rhamnosus",
    category: "Probiotic",
    benefit: "Immune Gut",
    description:
      "Clinically studied for diarrhoea prevention, eczema support, and gut-immune signalling.",
  },
  {
    id: 26,
    name: "L. plantarum",
    category: "Probiotic",
    benefit: "Bloating Relief",
    description:
      "Extremely resilient strain that reduces bloating and supports gut barrier integrity.",
  },
  {
    id: 27,
    name: "L. casei",
    category: "Probiotic",
    benefit: "Bowel Health",
    description:
      "Supports healthy bowel transit and reduces discomfort after antibiotic use.",
  },
  {
    id: 28,
    name: "B. longum",
    category: "Probiotic",
    benefit: "Mood & Gut",
    description:
      "Colonises the gut efficiently and supports stress-related gut symptoms and mood.",
  },
  {
    id: 29,
    name: "B. breve",
    category: "Probiotic",
    benefit: "Skin & Gut",
    description:
      "Particularly effective in the large intestine. Supports fat metabolism and skin hydration.",
  },
  {
    id: 30,
    name: "B. lactis",
    category: "Probiotic",
    benefit: "Immunity",
    description:
      "Enhances immune response and improves cholesterol profiles in clinical trials.",
  },
  {
    id: 31,
    name: "S. thermophilus",
    category: "Probiotic",
    benefit: "Digestion",
    description:
      "Produces lactase to reduce lactose intolerance symptoms and support smooth digestion.",
  },
  // Adaptogens — 5
  {
    id: 32,
    name: "Ashwagandha (KSM-66®)",
    category: "Adaptogen",
    benefit: "Stress & Sleep",
    description:
      "22+ clinical studies. Reduces cortisol, improves stress resilience, sleep, and strength.",
  },
  {
    id: 33,
    name: "Rhodiola Rosea",
    category: "Adaptogen",
    benefit: "Mental Energy",
    description:
      "Reduces mental fatigue under stress. Improves endurance, focus, and mood.",
  },
  {
    id: 34,
    name: "Holy Basil (Tulsi)",
    category: "Adaptogen",
    benefit: "Anxiety Relief",
    description:
      "Reduces anxiety, supports blood sugar balance, and has antimicrobial properties.",
  },
  {
    id: 35,
    name: "Ginseng (Panax)",
    category: "Adaptogen",
    benefit: "Stamina",
    description:
      "Boosts physical stamina and cognitive performance. Supports immune and blood sugar control.",
  },
  {
    id: 36,
    name: "Shatavari",
    category: "Adaptogen",
    benefit: "Hormonal Balance",
    description:
      "Ayurvedic adaptogen supporting hormonal balance, gut health, and immune function.",
  },
  // Antioxidants — 8
  {
    id: 37,
    name: "Coenzyme Q10",
    category: "Antioxidant",
    benefit: "Heart & Energy",
    description:
      "Powers cellular energy in mitochondria. Declines with age — critical for heart health.",
  },
  {
    id: 38,
    name: "Alpha Lipoic Acid",
    category: "Antioxidant",
    benefit: "Nerve Health",
    description:
      "Both water and fat-soluble antioxidant. Regenerates other antioxidants and supports nerves.",
  },
  {
    id: 39,
    name: "Lycopene",
    category: "Antioxidant",
    benefit: "Cellular Protection",
    description:
      "Potent carotenoid antioxidant clinically linked to reduced cardiovascular risk.",
  },
  {
    id: 40,
    name: "Lutein",
    category: "Antioxidant",
    benefit: "Eye Health",
    description:
      "Accumulates in the macula and protects against blue-light damage and vision loss.",
  },
  {
    id: 41,
    name: "Zeaxanthin",
    category: "Antioxidant",
    benefit: "Vision Protection",
    description:
      "Works with lutein to protect the retina — critical for screen-heavy lifestyles.",
  },
  {
    id: 42,
    name: "Resveratrol",
    category: "Antioxidant",
    benefit: "Longevity",
    description:
      "Activates longevity genes (sirtuins) and supports cardiovascular health and cellular ageing.",
  },
  {
    id: 43,
    name: "Green Tea Extract (EGCG)",
    category: "Antioxidant",
    benefit: "Metabolism",
    description:
      "Highest antioxidant concentration of any tea. Supports metabolism, brain, and fat oxidation.",
  },
  {
    id: 44,
    name: "Grape Seed Extract",
    category: "Antioxidant",
    benefit: "Circulation",
    description:
      "Rich in OPCs — powerful antioxidants supporting circulation, skin, and collagen synthesis.",
  },
  // Enzymes — 7
  {
    id: 45,
    name: "Amylase",
    category: "Enzyme",
    benefit: "Carb Digestion",
    description:
      "Breaks down complex carbohydrates into simple sugars, starting digestion in the mouth.",
  },
  {
    id: 46,
    name: "Protease",
    category: "Enzyme",
    benefit: "Protein Digestion",
    description:
      "Breaks down dietary protein into amino acids for absorption, reducing bloating.",
  },
  {
    id: 47,
    name: "Lipase",
    category: "Enzyme",
    benefit: "Fat Digestion",
    description:
      "Digests dietary fats into fatty acids and glycerol, supporting fat-soluble vitamin absorption.",
  },
  {
    id: 48,
    name: "Lactase",
    category: "Enzyme",
    benefit: "Dairy Comfort",
    description:
      "Breaks down lactose (milk sugar) — essential for the majority of Indians who are sensitive.",
  },
  {
    id: 49,
    name: "Cellulase",
    category: "Enzyme",
    benefit: "Fibre Digestion",
    description:
      "Breaks down cellulose from plant cell walls, improving fibre digestion and nutrient extraction.",
  },
  {
    id: 50,
    name: "Bromelain",
    category: "Enzyme",
    benefit: "Anti-Inflammation",
    description:
      "Pineapple-derived enzyme with anti-inflammatory and protein-digesting properties.",
  },
  {
    id: 51,
    name: "Papain",
    category: "Enzyme",
    benefit: "Gut Comfort",
    description:
      "Papaya-derived protease supporting protein digestion and natural anti-inflammatory effects.",
  },
  // Omega Fatty Acids — 5
  {
    id: 52,
    name: "Omega-3 (ALA)",
    category: "Omega",
    benefit: "Heart Health",
    description:
      "Plant-based essential omega-3 and precursor to EPA and DHA. Supports heart and brain.",
  },
  {
    id: 53,
    name: "EPA (Eicosapentaenoic Acid)",
    category: "Omega",
    benefit: "Anti-Inflammation",
    description:
      "Marine omega-3 with potent anti-inflammatory effects supporting mood, heart, and joints.",
  },
  {
    id: 54,
    name: "DHA (Docosahexaenoic Acid)",
    category: "Omega",
    benefit: "Brain Health",
    description:
      "Critical structural component of the brain and retina. Supports cognitive performance and memory.",
  },
  {
    id: 55,
    name: "Omega-6 (GLA)",
    category: "Omega",
    benefit: "Skin & Hormones",
    description:
      "Anti-inflammatory omega-6 supporting skin barrier, hormonal balance, and nerve function.",
  },
  {
    id: 56,
    name: "Omega-9 (Oleic Acid)",
    category: "Omega",
    benefit: "Heart Health",
    description:
      "Monounsaturated fat found in olive oil supporting heart health and reducing inflammation.",
  },
  // Superfoods — 4
  {
    id: 57,
    name: "Moringa (Drumstick Leaf)",
    category: "Superfood",
    benefit: "Superfood",
    description:
      "India's native superfood packed with iron, calcium, and antioxidants for energy and immunity.",
  },
  {
    id: 58,
    name: "Spirulina",
    category: "Superfood",
    benefit: "Plant Protein",
    description:
      "Blue-green algae with a complete protein profile — highest protein density of any plant food.",
  },
  {
    id: 59,
    name: "Turmeric (Curcumin)",
    category: "Superfood",
    benefit: "Anti-Inflammation",
    description:
      "India's most powerful anti-inflammatory spice, with bioavailability enhanced by Bioperine.",
  },
  {
    id: 60,
    name: "BioPerine® (Black Pepper)",
    category: "Superfood",
    benefit: "Bioavailability",
    description:
      "Patented piperine extract enhancing curcumin absorption by 2000% and overall nutrient uptake.",
  },
];

// ─── Tab 2: Clinical ingredient cards ───────────────────────────────────────

const CLINICAL_CARDS = [
  {
    emoji: "🌿",
    stat: "600mg",
    title: "KSM-66® Ashwagandha",
    image: "/images/ingredients/first-tab.webp",
    body: "22+ human clinical studies. Reduces cortisol by 27%, improves sleep quality by 72%, and boosts strength and endurance.",
  },
  {
    emoji: "⚗️",
    stat: "200mcg",
    title: "Chromax® Chromium",
    image: "/images/ingredients/second-tab.webp",
    body: "Patented chromium picolinate with superior absorption. Clinically proven to reduce sugar cravings and support blood glucose balance.",
  },
  {
    emoji: "🌶️",
    stat: "5mg",
    title: "BioPerine® Piperine",
    image: "/images/ingredients/third-tab.webp",
    body: "Patented black pepper extract that enhances curcumin bioavailability by 2000% and improves overall nutrient absorption.",
  },
  {
    emoji: "⚡",
    stat: "50mg",
    title: "Coenzyme Q10",
    image: "/images/ingredients/fourth-tab.webp",
    body: "Powers the mitochondrial energy cycle. Naturally declines after age 25. Supports heart muscle function and physical endurance.",
  },
  {
    emoji: "🧠",
    stat: "1000mcg",
    title: "Methylcobalamin B12",
    image: "/images/hero-slide-1.webp",
    body: "Active, bioavailable form of B12 — directly supports nerves and red blood cells. Critical for India's vegetarian majority.",
  },
  {
    emoji: "🦴",
    stat: "2000 IU + 100mcg",
    title: "D3 + K2 Synergy",
    image: "/images/hero-slide-2.webp",
    body: "D3 increases calcium absorption; K2 (MK-7) directs it to bones, not arteries. Must be combined for safe, effective bone protection.",
  },
];

// ─── Tab 3: Indian-body cards ────────────────────────────────────────────────

const INDIAN_CARDS = [
  {
    stat: "70%",
    title: "Vitamin D3 Deficiency",
    source: "ICMR Study",
    image: "/images/journey/frist-week.webp",
    body: "70%+ of Indians are Vitamin D deficient despite abundant sunshine. Our formula delivers 2000 IU daily — enough to actually correct it.",
  },
  {
    stat: "47%",
    title: "B12 Crisis in India",
    source: "AIIMS Research",
    image: "/images/journey/second-week.webp",
    body: "47% of Indians are B12 deficient. We use Methylcobalamin — the active, nervous-system-ready form — not cheap cyanocobalamin.",
  },
  {
    stat: "#1",
    title: "Iron Deficiency Burden",
    source: "WHO Global Report",
    image: "/images/journey/third-week.webp",
    body: "India has the world's highest anaemia burden. Our iron is paired with Vitamin C to maximise absorption — especially for women.",
  },
  {
    stat: "10×",
    title: "Gut for Indian Diets",
    source: "FUYL Formulation",
    image: "/images/journey/fourth-week.webp",
    body: "Indian diets are up to 10× higher in spice compounds than Western diets. Our probiotic and enzyme blend is calibrated for this.",
  },
  {
    stat: "5000+",
    title: "Heritage Superfoods",
    source: "Ayurvedic Literature",
    image: "/images/ingredients/second-tab.webp",
    body: "Moringa and Turmeric have powered Indian wellness for 5000+ years. We include them at clinically meaningful doses — not just traces.",
  },
  {
    stat: "100%",
    title: "Vegetarian Formula",
    source: "FUYL Guarantee",
    image: "/images/ingredients/third-tab.webp",
    body: "100% vegetarian-friendly. Zero cow-derived gelatin, no animal-sourced ingredients — formulated to respect every Indian dietary preference.",
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const PILLARS = [
  {
    n: "01",
    title: "Transparent Doses",
    image: "/images/ingredients/first-tab.webp",
    accentLight: "#D4688A",
  },
  {
    n: "02",
    title: "Clinical Ingredients",
    image: "/images/ingredients/second-tab.webp",
    accentLight: "#4ADE80",
  },
  {
    n: "03",
    title: "Indian-Body First",
    image: "/images/ingredients/third-tab.webp",
    accentLight: "#FCD34D",
  },
  {
    n: "04",
    title: "No Nonsense Manufacturing",
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
      className="aspect-4/5 cursor-pointer select-none"
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
              src="https://images.unsplash.com/photo-1514996937319-344454492b37?q=80&w=1200&auto=format&fit=crop"
              alt={ingredient.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full bg-brand-forest backdrop-blur">
              <Eye className="h-4 w-4 text-white" />
            </div>

            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-lg sm:text-xl md:text-2xl">
              {ingredient.name}
            </h3>
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
          60 ingredients · tap to reveal
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
          <div className="relative h-72 sm:h-80 lg:h-auto shrink-0 lg:w-5/12">
            <span className="absolute bottom-3 left-3 rounded-full bg-brand-teal px-3 py-1 text-xs font-bold text-white shadow-md">
              {card.stat}
            </span>
            <Image
              src={card.image}
              alt={card.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 30vw"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-8">
            <span className="text-3xl">{card.emoji}</span>
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
          <div className="relative h-72 sm:h-80 lg:h-auto shrink-0 lg:w-5/12">
            <Image
              src={card.image}
              alt={card.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 30vw"
            />
            <div className="absolute inset-0 bg-black/20" />
            <span className="absolute bottom-3 right-3 rounded-full bg-brand-forest px-3 py-1 text-[10px] font-bold text-white shadow-md">
              {card.source}
            </span>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-8">
            <span className="font-display text-display-lg leading-none text-brand-teal">
              {card.stat}
            </span>
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

// ─── Tab 4: Single manufacturing card — image LEFT, content RIGHT ────────────

function ManufacturingCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-lg lg:flex">
      {/* Image panel — left on desktop, top on mobile */}
      <div className="relative h-64 shrink-0 lg:h-auto lg:w-5/12">
        <Image
          src="/images/ingredients-hero.webp"
          alt="FUYL Manufacturing"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 42vw"
        />
      </div>

      {/* Content panel — right on desktop, below on mobile — heading + paragraph, vertically centered */}
      <div className="flex flex-1 flex-col justify-center gap-3 p-8 sm:p-10 lg:w-7/12">
        <p className="text-label tracking-widest text-brand-teal">
          Manufacturing Standard
        </p>
        <h3 className="font-display text-display-lg leading-tight text-brand-forest">
          BUILT WITHOUT
          <br />
          COMPROMISE.
        </h3>
        <p className="mt-1 text-body-md leading-relaxed text-brand-muted">
          Uncompromising standards at every step of the production chain.
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
