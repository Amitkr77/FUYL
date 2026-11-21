/**
 * Dry run of the fuyl.in sync — fetches and parses both sources, matches
 * ingredients to the knowledge base and checks label images, WITHOUT touching
 * the database. Useful to verify the live site still parses.
 *
 *   npm run sync:preview
 */
import { INGREDIENTS } from "../src/kb";
import { checkLabels } from "../src/sync/labels";
import { matchIngredientKeys } from "../src/sync/match";
import { parseIngredientsPage, parseProductJson } from "../src/sync/parse";

const STORE = (process.env.FUYL_STORE_URL ?? "https://fuyl.in").replace(/\/$/, "");
const HANDLE = process.env.FUYL_PRODUCT_HANDLE ?? "fuyl-complete";
const UA = { "User-Agent": "FUYL-Assessment-Sync/1.0 (+https://fuyl.in)" };

async function main() {
  const productRes = await fetch(`${STORE}/products/${HANDLE}.json`, { headers: UA });
  if (!productRes.ok) throw new Error(`product ${productRes.status}`);
  const product = parseProductJson(await productRes.json(), STORE);
  console.log(`\nPRODUCT  ${product.title}  (${product.url})`);
  console.log(`  from ₹${product.priceFrom} · ${product.variants.map((v) => `${v.title} ₹${v.price}`).join(" · ")}`);
  console.log(`  ${product.images.length} images`);

  const labels = checkLabels(product.images, {});
  for (const l of labels) console.log(`  label ${l.file} (${l.label}): ${l.status === "missing" ? "MISSING" : "found"}`);

  const pageRes = await fetch(`${STORE}/pages/ingredients`, { headers: UA });
  if (!pageRes.ok) throw new Error(`ingredients page ${pageRes.status}`);
  const cards = parseIngredientsPage(await pageRes.text());
  const matched = cards.map((c) => ({ title: c.title, keys: matchIngredientKeys(c.title, INGREDIENTS), hasImage: !!c.image, hasText: !!c.about }));
  const unmatched = matched.filter((m) => m.keys.length === 0);
  const keys = new Set(matched.flatMap((m) => m.keys));

  console.log(`\nINGREDIENTS  ${cards.length} cards → ${keys.size} of ${INGREDIENTS.length} knowledge-base ingredients`);
  console.log(`  with image: ${matched.filter((m) => m.hasImage).length} · with text: ${matched.filter((m) => m.hasText).length}`);
  console.log(`  unmatched: ${unmatched.length ? unmatched.map((u) => u.title).join(", ") : "none"}`);
  const notOnSite = INGREDIENTS.filter((i) => !keys.has(i.key)).map((i) => i.name);
  console.log(`  in KB but not on the page (${notOnSite.length}): ${notOnSite.join(", ")}`);

  const sample = cards.find((c) => c.title.includes("ASHWAGANDHA"));
  if (sample) {
    console.log(`\nSAMPLE  ${sample.title} [${sample.category}]`);
    console.log(`  about: ${sample.about}`);
    for (const p of sample.whatItDoes) console.log(`  • ${p.heading}: ${p.text}`);
    console.log(`  why: ${sample.whyItMatters}`);
  }
  if (unmatched.length || labels.some((l) => l.status === "missing")) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Preview failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
