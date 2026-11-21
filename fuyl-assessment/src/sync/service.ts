import "server-only";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { INGREDIENTS } from "@/kb";
import { StoreIngredient, StoreProduct, SyncRun, SyncState } from "@/models/store";
import { fetchJson, fetchText } from "./fetch";
import { checkLabels, needsReview, type LabelCheck } from "./labels";
import { matchIngredientKeys } from "./match";
import { parseIngredientsPage, parseProductJson, type StoreImage } from "./parse";

export type SyncTrigger = "cron" | "admin" | "script";

export interface SyncSummary {
  status: "success" | "partial" | "failed";
  product: { ok: boolean; error?: string; priceFrom?: number };
  ingredients: { ok: boolean; error?: string; count?: number; unmatched?: string[]; removed?: string[] };
  labels: LabelCheck[];
  labelReviewNeeded: boolean;
}

/** Anything that looks like a broken page rather than real data. */
const MIN_EXPECTED_INGREDIENTS = 30;

/**
 * Pull product + ingredient data from fuyl.in into the local database.
 *
 * Each source is synced independently: if one fails, the other still updates
 * and the failed one keeps its last good copy. A suspiciously small ingredient
 * list (e.g. a maintenance page) is treated as a failure rather than wiping data.
 */
export async function runSync(trigger: SyncTrigger): Promise<SyncSummary> {
  await connectDB();
  const { FUYL_STORE_URL, FUYL_PRODUCT_HANDLE } = env();
  const base = FUYL_STORE_URL.replace(/\/$/, "");
  const startedAt = new Date();

  const summary: SyncSummary = {
    status: "failed",
    product: { ok: false },
    ingredients: { ok: false },
    labels: [],
    labelReviewNeeded: false,
  };

  // ── Product ──
  let images: StoreImage[] | null = null;
  try {
    const product = parseProductJson(await fetchJson(`${base}/products/${FUYL_PRODUCT_HANDLE}.json`), base);
    await StoreProduct.updateOne({ handle: product.handle }, { $set: { ...product, syncedAt: startedAt } }, { upsert: true });
    images = product.images;
    summary.product = { ok: true, priceFrom: product.priceFrom };
  } catch (err) {
    summary.product = { ok: false, error: message(err) };
  }

  // ── Ingredients ──
  try {
    const cards = parseIngredientsPage(await fetchText(`${base}/pages/ingredients`));
    if (cards.length < MIN_EXPECTED_INGREDIENTS) {
      throw new Error(`Only ${cards.length} ingredient cards found — the page layout may have changed. Kept the previous copy.`);
    }
    const unmatched: string[] = [];
    const ops = cards.map((card) => {
      const matchedKeys = matchIngredientKeys(card.title, INGREDIENTS);
      if (matchedKeys.length === 0) unmatched.push(card.title);
      return {
        updateOne: {
          filter: { title: card.title },
          update: { $set: { ...card, matchedKeys, active: true, syncedAt: startedAt } },
          upsert: true,
        },
      };
    });
    await StoreIngredient.bulkWrite(ops);
    // Cards that vanished from the site are kept but marked inactive.
    const titles = cards.map((c) => c.title);
    const gone = await StoreIngredient.find({ title: { $nin: titles }, active: true }, { title: 1 }).lean();
    if (gone.length) await StoreIngredient.updateMany({ title: { $nin: titles } }, { $set: { active: false } });
    summary.ingredients = { ok: true, count: cards.length, unmatched, removed: gone.map((g) => g.title) };
  } catch (err) {
    summary.ingredients = { ok: false, error: message(err) };
  }

  // ── Label images ──
  const state = await SyncState.findById("singleton").lean();
  const acknowledged: Record<string, string> = Object.fromEntries(
    (state?.acknowledgedLabels ?? []).filter((l) => l.file && l.src).map((l) => [l.file!, l.src!]),
  );
  if (images) {
    summary.labels = checkLabels(images, acknowledged);
    // First sighting of a label image becomes its baseline (KB doses were transcribed from it).
    const baseline = summary.labels.filter((l) => l.status === "baseline" && l.currentSrc);
    const nextAcknowledged = [
      ...Object.entries(acknowledged).map(([file, src]) => ({ file, src })),
      ...baseline.map((l) => ({ file: l.file, src: l.currentSrc! })),
    ];
    summary.labelReviewNeeded = needsReview(summary.labels);
    await SyncState.updateOne(
      { _id: "singleton" },
      {
        $set: {
          acknowledgedLabels: nextAcknowledged,
          labelReviewNeeded: summary.labelReviewNeeded,
          ...(summary.product.ok && summary.ingredients.ok ? { lastSuccessAt: new Date() } : {}),
        },
      },
      { upsert: true },
    );
  } else {
    summary.labelReviewNeeded = Boolean(state?.labelReviewNeeded);
  }

  summary.status =
    summary.product.ok && summary.ingredients.ok ? "success" : summary.product.ok || summary.ingredients.ok ? "partial" : "failed";

  await SyncRun.create({ trigger, startedAt, finishedAt: new Date(), ...summary });
  return summary;
}

/** Admin confirms the KB doses still match the current label images. */
export async function acknowledgeLabels(): Promise<void> {
  await connectDB();
  const product = await StoreProduct.findOne({ handle: env().FUYL_PRODUCT_HANDLE }).lean();
  if (!product) throw new Error("No product synced yet.");
  const checks = checkLabels((product.images ?? []) as StoreImage[], {});
  const acknowledgedLabels = checks.filter((c) => c.currentSrc).map((c) => ({ file: c.file, src: c.currentSrc! }));
  await SyncState.updateOne({ _id: "singleton" }, { $set: { acknowledgedLabels, labelReviewNeeded: false } }, { upsert: true });
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
