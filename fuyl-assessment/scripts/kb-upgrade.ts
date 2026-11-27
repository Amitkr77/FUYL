/**
 * Bring an existing knowledge-base DRAFT up to date with question and data
 * changes that shipped in the seed after the draft was created:
 *   - personalised question flow: the "what have you noticed lately?" check-in,
 *     deep dives and lifestyle questions shown only when relevant, honest
 *     "last step" wording, "Did you know?" insights, no pick limits
 *   - vitamins & minerals: India (ICMR-NIN 2020) vs global (US NIH) reference values
 *   - location (country / state), work pattern, supplements, the "typical week"
 *     diet grid, iodised salt and fortified foods; the old single food questions
 *     (dairy, fish, fruit & veg, staple, protein) are retired
 *   - food groups for the diet estimate, supplement safety rules, wellness-score
 *     weights and a higher question cap
 *
 * Questions are synced to the seed (new ones added, changed ones replaced) —
 * the dry run lists every question that would change, so you can see if it
 * would overwrite edits your team made. Ingredients only GAIN reference
 * values; nothing else on them is touched. Every changed entry is marked
 * "draft" for review, and nothing reaches users until an admin publishes.
 *
 *   npm run kb:upgrade            # dry run — shows what would change
 *   npm run kb:upgrade -- --apply # writes the draft
 */
import mongoose from "mongoose";
import { getDraft, saveDraft } from "../src/lib/admin/kbStore";
import { deleteEntity, markDraft, upsertEntity, type Reviews } from "../src/kb/draft";
import { seedKnowledgeBase } from "../src/kb";
import type { KnowledgeBase, Question } from "../src/engine";

const apply = process.argv.includes("--apply");
/** Questions the seed retired. Only these are removed — anything your team added stays. */
const RETIRED_QUESTIONS = ["dairy", "fish", "fruitveg", "staple", "protein"];

/** Stable comparison (key order doesn't matter). */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));

function changedFields(a: Question, b: Question): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => canon((a as unknown as Record<string, unknown>)[k]) !== canon((b as unknown as Record<string, unknown>)[k]));
}

async function main() {
  const seed = seedKnowledgeBase();
  const { kb: draft, reviews } = await getDraft();
  let kb: KnowledgeBase = draft;
  let rev: Reviews = reviews;
  const changes: string[] = [];

  const step = (type: "question" | "ingredient" | "safety", value: unknown, originalKey: string | undefined, key: string, note: string) => {
    const r = upsertEntity(kb, type, value, originalKey);
    if (!r.ok) throw new Error(`${type} ${key}: ${r.error}${r.issues ? " — " + r.issues.map((i) => `${i.path}: ${i.message}`).join("; ") : ""}`);
    kb = r.kb;
    rev = markDraft(rev, type, key);
    changes.push(note);
  };

  // 1. New questions first (others' conditions may refer to them).
  for (const q of seed.questions) {
    if (!kb.questions.some((x) => x.key === q.key)) step("question", q, undefined, q.key, `+ question "${q.key}" (new)`);
  }
  // 2. Changed questions → the seed version.
  for (const q of seed.questions) {
    const cur = kb.questions.find((x) => x.key === q.key)!;
    const diff = changedFields(cur, q);
    if (diff.length) step("question", q, q.key, q.key, `~ question "${q.key}": ${diff.join(", ")}`);
  }
  // 3. Reference values for vitamins & minerals (added only where missing).
  for (const fresh of seed.ingredients.filter((i) => i.nutrient)) {
    const cur = kb.ingredients.find((i) => i.key === fresh.key);
    if (!cur || cur.nutrient) continue;
    step("ingredient", { ...cur, nutrient: fresh.nutrient }, cur.key, cur.key, `+ ingredient "${cur.key}": India/global reference values`);
  }

  // 4. New safety rules (existing ones are left as your team edited them).
  for (const r of seed.safetyRules) {
    if (!kb.safetyRules.some((x) => x.key === r.key)) step("safety", r, undefined, r.key, `+ safety rule "${r.key}" (new)`);
  }
  // 5. Food groups for the diet estimate (only if the draft has none yet).
  if (!kb.foods?.length && seed.foods?.length) {
    kb = { ...kb, foods: seed.foods };
    changes.push(`+ ${seed.foods.length} food groups for the diet estimate`);
  }
  // 6. Settings: wellness weights if missing; question cap raised to the seed's if lower.
  if (!kb.settings.wellness && seed.settings.wellness) {
    kb = { ...kb, settings: { ...kb.settings, wellness: seed.settings.wellness } };
    changes.push("+ settings: wellness score weights");
  }
  if (kb.settings.questionCap < seed.settings.questionCap) {
    changes.push(`~ settings: question cap ${kb.settings.questionCap} → ${seed.settings.questionCap}`);
    kb = { ...kb, settings: { ...kb.settings, questionCap: seed.settings.questionCap } };
  }
  // 7. Retire the old single food questions (last, once nothing refers to them).
  for (const key of RETIRED_QUESTIONS) {
    if (!kb.questions.some((q) => q.key === key)) continue;
    const r = deleteEntity(kb, "question", key);
    if (!r.ok) throw new Error(`question ${key}: ${r.error}`);
    kb = r.kb;
    changes.push(`- question "${key}" (replaced by the "typical week" grid)`);
  }

  if (!changes.length) console.log("The draft is already up to date. Nothing to do.");
  else {
    console.log(`${changes.length} change(s):\n  ${changes.join("\n  ")}`);
    if (apply) {
      await saveDraft(kb, rev, "kb-upgrade script");
      console.log("\nSaved to the draft. Review the marked entries in /admin, then publish.");
    } else console.log("\nDry run — nothing saved. Re-run with --apply to write the draft.");
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
