import type { Ingredient } from "@/engine";

/**
 * Map ingredient titles from fuyl.in (e.g. "KSM-66 ASHWAGANDHA", "FLAX SEED",
 * "MONKFRUIT") to knowledge-base keys. Matching is on a "compact" form —
 * lower-case letters and digits only — compared against each KB ingredient's
 * key and name, with and without parenthetical notes and trailing form words
 * like "Extract" or "Powder".
 *
 * The site lists the 5-enzyme Digezyme® blend as ONE card, so that title maps
 * to every enzyme in the blend.
 */

const compact = (s: string) =>
  s
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

const stripParens = (s: string) => s.replace(/\([^)]*\)/g, " ");
const stripForm = (s: string) => s.replace(/\b(extract|powder|galactomannan)\b/gi, " ");

function candidates(i: Ingredient): Set<string> {
  const names = [i.name, stripParens(i.name), stripForm(stripParens(i.name))];
  return new Set([compact(i.key), ...names.map(compact)].filter(Boolean));
}

const GROUP_ALIASES: { test: (c: string) => boolean; select: (i: Ingredient) => boolean }[] = [
  {
    test: (c) => c.includes("digezyme") || c.includes("digenzyme") || c.startsWith("enzymeblend"),
    select: (i) => (i.blend ?? "").toLowerCase().includes("digezyme"),
  },
];

export function matchIngredientKeys(title: string, ingredients: Ingredient[]): string[] {
  const c = compact(title);
  if (!c) return [];

  const group = GROUP_ALIASES.find((g) => g.test(c));
  if (group) return ingredients.filter(group.select).map((i) => i.key);

  const exact = ingredients.find((i) => candidates(i).has(c));
  return exact ? [exact.key] : [];
}
