import type { FoodSource } from "@/engine";

/**
 * Food groups for the "estimated from your diet" nutrient intake.
 *
 * DRAFT — for nutritionist review. Typical amounts per serving, rounded, from
 * the Indian Food Composition Tables (IFCT 2017, NIN) for common Indian
 * portions; fortified foods follow FSSAI fortification standards. They give a
 * rough estimate from a short questionnaire, not a measurement — the report
 * says so. Units match the nutrient reference values (mg / mcg / IU).
 *
 * Only nutrients with reasonable food data are estimated (iron, zinc,
 * magnesium, folate, B1, B2, B12, vitamins A, C, D, E, iodine); the rest show
 * "one serve vs daily need" only.
 */
const grid = (row: string) => ({ question: "diet_week", row });

export const FOODS: FoodSource[] = [
  // Everyday cereals everyone eats (rice / roti), ~3 servings a day.
  {
    key: "cereals",
    name: "Everyday rice or roti",
    from: { always: 3 },
    nutrients: { iron: 1.0, zinc: 0.6, magnesium: 25, "vitamin-b1": 0.1, "vitamin-b2": 0.03, folate: 8 },
  },
  {
    key: "dairy",
    name: "Milk, curd or paneer (1 cup / 40 g paneer)",
    from: grid("dairy"),
    nutrients: { "vitamin-b12": 0.9, "vitamin-b2": 0.35, "vitamin-a": 60, zinc: 0.8, magnesium: 25, iodine: 30, folate: 10, iron: 0.2, "vitamin-c": 2 },
  },
  {
    key: "eggs",
    name: "Eggs (1 egg)",
    from: grid("eggs"),
    nutrients: { "vitamin-b12": 0.5, "vitamin-d3": 40, "vitamin-a": 75, iron: 0.9, zinc: 0.6, folate: 22, "vitamin-b2": 0.25, iodine: 25, magnesium: 6, "vitamin-e": 0.5 },
  },
  {
    key: "meat",
    name: "Chicken, mutton or fish (1 portion, ~75 g cooked)",
    from: grid("meat"),
    nutrients: { "vitamin-b12": 1.5, iron: 1.5, zinc: 2.5, "vitamin-d3": 100, magnesium: 20, iodine: 15, folate: 5, "vitamin-b2": 0.15, "vitamin-a": 10 },
  },
  {
    key: "pulses",
    name: "Dal, beans, chana, rajma or soy (1 katori)",
    from: grid("pulses"),
    nutrients: { iron: 2.0, folate: 60, zinc: 0.9, magnesium: 40, "vitamin-b1": 0.15, "vitamin-b2": 0.06 },
  },
  {
    key: "greens",
    name: "Green leafy vegetables (1 katori)",
    from: grid("greens"),
    nutrients: { iron: 2.0, folate: 60, "vitamin-a": 300, "vitamin-c": 15, magnesium: 40, "vitamin-e": 1.0 },
  },
  {
    key: "veg",
    name: "Other vegetables (1 katori)",
    from: grid("veg"),
    nutrients: { "vitamin-c": 15, "vitamin-a": 60, folate: 20, magnesium: 15, iron: 0.5 },
  },
  {
    key: "fruits",
    name: "Fruit (1 medium fruit)",
    from: grid("fruits"),
    nutrients: { "vitamin-c": 40, folate: 20, "vitamin-a": 30, magnesium: 10 },
  },
  {
    key: "nuts",
    name: "Nuts & seeds (1 small handful)",
    from: grid("nuts"),
    nutrients: { "vitamin-e": 3.5, magnesium: 60, zinc: 1.0, iron: 1.0, folate: 15, "vitamin-b1": 0.1 },
  },
  {
    key: "millets",
    name: "Millets or whole grains (1 roti / katori)",
    from: grid("millets"),
    nutrients: { iron: 1.5, magnesium: 40, zinc: 0.8, "vitamin-b1": 0.12, folate: 10 },
  },
  // Fortified foods (FSSAI standards): iodised salt ~5 g/day at 15 ppm; fortified milk (A & D); fortified atta/rice.
  { key: "iodised-salt", name: "Iodised salt (daily use)", from: { question: "iodised" }, nutrients: { iodine: 75 } },
  { key: "fortified-milk", name: "Fortified milk", from: { question: "fortified", option: "milk" }, nutrients: { "vitamin-d3": 50, "vitamin-a": 70 } },
  { key: "fortified-atta", name: "Fortified atta or rice", from: { question: "fortified", option: "atta" }, nutrients: { iron: 3.0, folate: 10, "vitamin-b12": 0.1 } },
];
