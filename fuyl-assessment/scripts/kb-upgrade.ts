/**
 * Bring an existing knowledge-base DRAFT up to date with seed changes that
 * shipped after it was created:
 *   - the priorities / training / stress_impact / focus_type questions allow
 *     any number of picks (maxSelect removed, scoreTop keeps match % calibrated)
 *   - vitamins & minerals get India (ICMR-NIN 2020) vs global (US NIH)
 *     daily reference values for the report comparison
 *
 * Only those fields are touched; any other edits your team made are kept.
 * Every changed entry is marked "draft" so it goes through review again, and
 * nothing reaches users until an admin publishes.
 *
 *   npm run kb:upgrade            # dry run — shows what would change
 *   npm run kb:upgrade -- --apply # writes the draft
 */
import mongoose from "mongoose";
import { getDraft, saveDraft } from "../src/lib/admin/kbStore";
import { markDraft, upsertEntity, type Reviews } from "../src/kb/draft";
import { seedKnowledgeBase } from "../src/kb";
import type { KnowledgeBase } from "../src/engine";

const apply = process.argv.includes("--apply");
const QUESTION_KEYS = ["priorities", "training", "stress_impact", "focus_type"];

async function main() {
  const seed = seedKnowledgeBase();
  const { kb: draft, reviews } = await getDraft();
  let kb: KnowledgeBase = draft;
  let rev: Reviews = reviews;
  const changes: string[] = [];

  for (const key of QUESTION_KEYS) {
    const cur = kb.questions.find((q) => q.key === key);
    const fresh = seed.questions.find((q) => q.key === key);
    if (!cur || !fresh) continue;
    if (cur.maxSelect === undefined && cur.scoreTop === fresh.scoreTop) continue;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxSelect: _drop, ...rest } = cur;
    const next = { ...rest, scoreTop: fresh.scoreTop, helper: /up to \d/i.test(cur.helper ?? "") ? fresh.helper : cur.helper };
    const r = upsertEntity(kb, "question", next, key);
    if (!r.ok) throw new Error(`question ${key}: ${r.error}`);
    kb = r.kb;
    rev = markDraft(rev, "question", key);
    changes.push(`question "${key}": maxSelect ${cur.maxSelect ?? "—"} → none, scoreTop ${fresh.scoreTop}`);
  }

  for (const fresh of seed.ingredients.filter((i) => i.nutrient)) {
    const cur = kb.ingredients.find((i) => i.key === fresh.key);
    if (!cur || cur.nutrient) continue;
    const r = upsertEntity(kb, "ingredient", { ...cur, nutrient: fresh.nutrient }, cur.key);
    if (!r.ok) throw new Error(`ingredient ${cur.key}: ${r.error}`);
    kb = r.kb;
    rev = markDraft(rev, "ingredient", cur.key);
    changes.push(`ingredient "${cur.key}": + India/global reference values`);
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
