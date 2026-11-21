import type { Ingredient } from "@/engine";

/**
 * All 60 FUYL COMPLETE+ ingredients, per 10 g sachet.
 *
 * Source: the two label images on https://fuyl.in/products/fuyl-complete
 *   - "Blend Profile · per 10 g sachet"  → blends + blend totals (botanicals)
 *   - "Nutritional Information"          → per-nutrient doses + %RDA (ICMR 2020)
 * Transcribed 2026-11-21. Botanicals only have blend-level totals on the label,
 * so `blendDose` is the blend total — never invent a per-ingredient amount.
 *
 * 34 blend actives + 13 vitamins + 6 minerals + 7 other ingredients = 60.
 * Descriptions are short, claim-safe drafts for nutritionist review; richer
 * copy is synced from fuyl.in/pages/ingredients where it exists.
 */

const blend = (name: string, dose: string, category: string) => ({ blend: name, blendDose: dose, category });

const GREENS = blend("Greens Blend", "750 mg", "Greens & Superfoods");
const DETOX = blend("Detox & Liver Health", "150 mg", "Detox");
const BERRY = blend("Berry Blend", "2,600 mg", "Fruits & Berries");
const SUPERFRUIT = blend("Superfruits Blend", "1,100 mg", "Fruits & Berries");
const OMEGA = blend("Omega Blend", "200 mg", "Greens & Superfoods");
const IMMUNITY = blend("Immunity Blend", "300 mg", "Immunity");
const ADAPTOGEN = blend("Adaptogen & Cognitive Blend", "400 mg", "Cognitive Health & Adaptogens");
const PREBIOTIC = blend("Prebiotics", "1,600 mg", "Gut Health");
const PROBIOTIC = blend("Probiotics", "2 billion CFU", "Gut Health");
const ENZYME = blend("Digestive Enzyme Blend (Digezyme®)", "50 mg", "Gut Health");
const ANTIOX = blend("Antioxidant Actives", "240 mg", "Antioxidants");
const VIT = { blend: "Vitamin-Mineral Premix", category: "Vitamins & Minerals" };
const OTHER = { blend: "Other Ingredients", category: "Other" };

export const INGREDIENTS: Ingredient[] = [
  // ── Greens Blend · 750 mg ──
  { key: "spinach", name: "Spinach", ...GREENS, description: "Whole-leaf green, naturally rich in folate, iron and lutein." },
  { key: "moringa", name: "Moringa Leaf", ...GREENS, description: "Nutrient-dense leaf traditionally valued across India." },
  { key: "wheatgrass", name: "Wheatgrass", ...GREENS, description: "Young grass harvested at peak chlorophyll." },
  { key: "beetroot", name: "Beetroot", ...GREENS, description: "Natural source of dietary nitrates, studied for exercise performance and circulation." },
  { key: "mint", name: "Mint Leaf", ...GREENS, description: "Long used in Indian kitchens to settle digestion." },

  // ── Detox & Liver Health · 150 mg ──
  { key: "milk-thistle", name: "Milk Thistle Extract", ...DETOX, description: "Source of silymarin, one of the most studied botanicals for liver health." },
  { key: "broccoli-sprout", name: "Broccoli Sprout Extract", ...DETOX, description: "Source of sulforaphane, studied for supporting the body's own protective enzymes." },

  // ── Berry Blend · 2,600 mg ──
  { key: "blueberry", name: "Blueberry", ...BERRY, description: "Rich in anthocyanins, studied for brain health." },
  { key: "tart-cherry", name: "Tart Cherry", ...BERRY, description: "Studied for exercise recovery and sleep quality." },
  { key: "acai", name: "Acai Berry", ...BERRY, description: "Amazonian berry rich in polyphenols." },
  { key: "strawberry", name: "Strawberry", ...BERRY, description: "Adds a distinct class of berry polyphenols." },
  { key: "raspberry", name: "Raspberry", ...BERRY, description: "Rich in ellagitannins." },

  // ── Superfruits Blend · 1,100 mg ──
  { key: "apple", name: "Apple", ...SUPERFRUIT, description: "Source of quercetin and fibre." },
  { key: "pineapple", name: "Pineapple", ...SUPERFRUIT, description: "Natural source of bromelain, a protein-digesting enzyme." },
  { key: "pomegranate", name: "Pomegranate", ...SUPERFRUIT, description: "Source of punicalagins, prized in Ayurveda." },

  // ── Omega Blend · 200 mg ──
  { key: "flaxseed", name: "Flaxseed Powder", ...OMEGA, description: "Plant source of omega-3 (ALA) and lignans." },

  // ── Immunity Blend · 300 mg ──
  { key: "amla", name: "Amla Extract", ...IMMUNITY, description: "Indian gooseberry, a traditional source of vitamin C." },
  { key: "giloy", name: "Giloy Extract", ...IMMUNITY, description: "Ayurvedic herb traditionally used for immunity." },

  // ── Adaptogen & Cognitive Blend · 400 mg ──
  { key: "ashwagandha", name: "KSM-66® Ashwagandha", ...ADAPTOGEN, description: "Full-spectrum root extract with 22+ human clinical trials on stress, sleep and energy." },
  { key: "brahmi", name: "Brahmi (Bacopa monnieri)", ...ADAPTOGEN, description: "Classical Ayurvedic herb traditionally used for memory and focus." },
  { key: "tulsi", name: "Tulsi Extract", ...ADAPTOGEN, description: "Holy basil, a traditional adaptogen." },

  // ── Prebiotics · 1,600 mg ──
  { key: "phgg", name: "PHGG Sunfiber®", ...PREBIOTIC, description: "Gentle, Low-FODMAP-certified prebiotic fibre." },
  { key: "fenugreek", name: "Fenugreek Galactomannan", ...PREBIOTIC, description: "Soluble fibre from fenugreek seed." },
  { key: "inulin", name: "Inulin", ...PREBIOTIC, description: "Prebiotic fibre that feeds beneficial gut bacteria." },
  { key: "fos", name: "FOS (Fructooligosaccharides)", ...PREBIOTIC, description: "Prebiotic fibre that feeds beneficial gut bacteria." },

  // ── Probiotics · 2 billion CFU ──
  { key: "bacillus-coagulans", name: "Bacillus coagulans", ...PROBIOTIC, description: "Spore-forming probiotic that survives stomach acid." },

  // ── Digestive Enzyme Blend (Digezyme®) · 50 mg ──
  { key: "amylase", name: "Amylase", ...ENZYME, description: "Enzyme that helps break down carbohydrates." },
  { key: "protease", name: "Protease", ...ENZYME, description: "Enzyme that helps break down proteins." },
  { key: "cellulase", name: "Cellulase", ...ENZYME, description: "Enzyme that helps break down plant fibre." },
  { key: "lipase", name: "Lipase", ...ENZYME, description: "Enzyme that helps break down fats." },
  { key: "lactase", name: "Lactase", ...ENZYME, description: "Enzyme that helps break down lactose (milk sugar)." },

  // ── Antioxidant Actives · 240 mg ──
  { key: "ala", name: "Alpha Lipoic Acid", ...ANTIOX, description: "Antioxidant active in both water and fat." },
  { key: "grape-seed", name: "Grape Seed Extract", ...ANTIOX, description: "Rich in OPCs (oligomeric proanthocyanidins)." },
  { key: "astaxanthin", name: "Astaxanthin", ...ANTIOX, description: "Carotenoid antioxidant studied for skin and eye health." },

  // ── Vitamins (per 10 g · %RDA per serve) ──
  { key: "vitamin-c", name: "Vitamin C", ...VIT, dose: "60 mg", rda: 75, description: "Contributes to the normal function of the immune system and to normal collagen formation." },
  { key: "vitamin-b1", name: "Vitamin B1 (Thiamine)", ...VIT, dose: "1.2 mg", rda: 85.7, description: "Contributes to normal energy-yielding metabolism." },
  { key: "vitamin-b2", name: "Vitamin B2 (Riboflavin)", ...VIT, dose: "1.6 mg", rda: 80, description: "Contributes to normal energy-yielding metabolism and the maintenance of normal skin." },
  { key: "vitamin-b3", name: "Vitamin B3 (Niacin)", ...VIT, dose: "11 mg", rda: 78.6, description: "Contributes to normal energy-yielding metabolism and the reduction of tiredness." },
  { key: "vitamin-b5", name: "Vitamin B5 (Pantothenic Acid)", ...VIT, dose: "4 mg", rda: 80, description: "Contributes to normal energy-yielding metabolism and normal mental performance." },
  { key: "vitamin-b6", name: "Vitamin B6", ...VIT, dose: "1.5 mg", rda: 78.9, description: "Contributes to normal psychological function and the reduction of tiredness." },
  { key: "folate", name: "Folate", ...VIT, dose: "150 mcg", rda: 50, description: "Contributes to normal blood formation and the reduction of tiredness." },
  { key: "vitamin-b12", name: "Vitamin B12", ...VIT, dose: "2.2 mcg", rda: 100, description: "Contributes to normal energy-yielding metabolism, normal red blood cell formation and the reduction of tiredness." },
  { key: "vitamin-a", name: "Vitamin A", ...VIT, dose: "500 mcg RAE", rda: 50, description: "Contributes to normal vision, skin and immune function." },
  { key: "vitamin-d3", name: "Vitamin D3", ...VIT, dose: "600 IU", rda: 100, description: "Contributes to the maintenance of normal bones and normal immune function." },
  { key: "vitamin-e", name: "Vitamin E", ...VIT, dose: "4 mg", rda: 40, description: "Contributes to the protection of cells from oxidative stress." },
  { key: "vitamin-k2", name: "Vitamin K2 (MK-7)", ...VIT, dose: "30 mcg", rda: 54.5, description: "Contributes to the maintenance of normal bones." },
  { key: "biotin", name: "Biotin", ...VIT, dose: "35 mcg", rda: 87.5, description: "Contributes to the maintenance of normal hair and skin." },

  // ── Minerals (per 10 g · %RDA per serve) ──
  { key: "magnesium", name: "Magnesium", ...VIT, dose: "50 mg", rda: 11.4, description: "Contributes to normal muscle function and the reduction of tiredness." },
  { key: "zinc", name: "Zinc", ...VIT, dose: "6 mg", rda: 35.3, description: "Contributes to normal immune function and the maintenance of normal skin, hair and nails." },
  { key: "iron", name: "Iron", ...VIT, dose: "3 mg", rda: 15.8, description: "Contributes to normal oxygen transport and the reduction of tiredness." },
  { key: "selenium", name: "Selenium", ...VIT, dose: "20 mcg", rda: 50, description: "Contributes to normal thyroid function and the maintenance of normal hair and nails." },
  { key: "iodine", name: "Iodine", ...VIT, dose: "50 mcg", rda: 35.7, description: "Contributes to normal thyroid function and normal cognitive function." },
  { key: "manganese", name: "Manganese", ...VIT, dose: "0.7 mg", rda: 17.5, description: "Contributes to the maintenance of normal bones." },

  // ── Other ingredients ──
  { key: "raspberry-flavour", name: "Natural Raspberry Flavour", ...OTHER, description: "Natural flavour." },
  { key: "monk-fruit", name: "Monk Fruit", ...OTHER, description: "Natural, zero-calorie sweetener." },
  { key: "malic-acid", name: "Malic Acid", ...OTHER, description: "Naturally occurring fruit acid for a fresh taste." },
  { key: "coconut-milk-powder", name: "Coconut Milk Powder", ...OTHER, description: "Gives a smooth, creamy texture." },
  { key: "tapioca-dextrin", name: "Tapioca Dextrin", ...OTHER, description: "Plant-based carrier." },
  { key: "piperine", name: "Piperine", ...OTHER, description: "Black-pepper extract used to support absorption." },
  { key: "xanthan-gum", name: "Xanthan Gum", ...OTHER, description: "Keeps the drink evenly mixed." },
];
