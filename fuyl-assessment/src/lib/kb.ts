import "server-only";
import type { KnowledgeBase } from "@/engine";
import { seedKnowledgeBase, withReferenceDefaults } from "@/kb";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { KbVersion } from "@/models/admin";
import { StoreIngredient, StoreProduct } from "@/models/store";
import { applyStoreData } from "@/sync/merge";

/**
 * The live knowledge base: the latest version published from the admin, with
 * ingredient images from fuyl.in. Before anything has been published it falls
 * back to the drafted seed — but the public assessment stays closed in that
 * state unless ALLOW_UNPUBLISHED_KB=true (local testing only).
 *
 * Caching: every request does one cheap indexed lookup of the latest version
 * NUMBER; the full KB is rebuilt only when that number changes (or ingredient
 * images are older than a minute). So a publish takes effect immediately on
 * every server instance. The cache lives on globalThis because Next bundles
 * route handlers and server actions separately — a module-level variable
 * would exist once per bundle and invalidation would miss the others.
 */
const IMAGES_TTL_MS = 60_000;
type Cache = { version: number; at: number; kb: KnowledgeBase; published: boolean };
const g = globalThis as unknown as { __fuylKbCache?: Cache | null };

export function invalidateKnowledgeBaseCache(): void {
  g.__fuylKbCache = null;
}

async function load(): Promise<{ kb: KnowledgeBase; published: boolean }> {
  await connectDB();
  const head = await KbVersion.findOne({}, { version: 1 }).sort({ version: -1 }).lean();
  const version = head?.version ?? 0;
  const cached = g.__fuylKbCache;
  if (cached && cached.version === version && Date.now() - cached.at < IMAGES_TTL_MS) return cached;

  const latest = version ? await KbVersion.findOne({ version }).lean() : null;
  const base = (latest?.kb as KnowledgeBase | undefined) ?? seedKnowledgeBase();
  let kb = base;
  try {
    const synced = await StoreIngredient.find({ active: true }, { matchedKeys: 1, image: 1 }).lean();
    kb = applyStoreData(base, synced.map((s) => ({ matchedKeys: s.matchedKeys ?? [], image: s.image ?? undefined })));
  } catch (err) {
    console.error("[kb] store images unavailable, using KB only", err);
  }
  // Until a reviewed version with India/global reference values is published, use the built-in ones.
  kb = withReferenceDefaults(kb);
  const fresh: Cache = { version, at: Date.now(), kb, published: Boolean(latest) };
  g.__fuylKbCache = fresh;
  return fresh;
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  return (await load()).kb;
}

/** True once a reviewed version is published (or the local preview flag is on). */
export async function isAssessmentLive(): Promise<boolean> {
  if (process.env.ALLOW_UNPUBLISHED_KB === "true") return true;
  try {
    return (await load()).published;
  } catch {
    return false;
  }
}

export interface ProductInfo {
  title: string;
  url: string;
  priceFrom: number;
  image?: string;
  variants: { title: string; price: number }[];
  description?: string;
}

/** Fallback if fuyl.in has never been synced — values from the live store, 2026-11-21. */
const FALLBACK: ProductInfo = {
  title: "FUYL COMPLETE+",
  url: "https://fuyl.in/products/fuyl-complete",
  priceFrom: 1499,
  variants: [
    { title: "Pack of 1", price: 1499 },
    { title: "Pack of 2", price: 2799 },
  ],
  description: "Daily Nutrition Powder · Mixed Berry Flavour · 15 Sachets",
};

// The product changes at most once a day (sync), so cache it briefly instead
// of reading it on every result page and unlock. Shared across bundles.
const PRODUCT_TTL_MS = 60_000;
const pg = globalThis as unknown as { __fuylProduct?: { at: number; product: ProductInfo } };

export async function getProduct(): Promise<ProductInfo> {
  const cached = pg.__fuylProduct;
  if (cached && Date.now() - cached.at < PRODUCT_TTL_MS) return cached.product;
  const product = await loadProduct();
  pg.__fuylProduct = { at: Date.now(), product };
  return product;
}

/** Clear the product cache (after a sync). */
export function invalidateProductCache(): void {
  pg.__fuylProduct = undefined;
}

async function loadProduct(): Promise<ProductInfo> {
  try {
    await connectDB();
    const p = await StoreProduct.findOne({ handle: env().FUYL_PRODUCT_HANDLE }).lean();
    if (!p) return FALLBACK;
    return {
      title: p.title,
      url: p.url,
      priceFrom: p.priceFrom,
      image: p.images?.[0]?.src ?? undefined,
      variants: (p.variants ?? []).map((v) => ({ title: v.title ?? "", price: v.price ?? 0 })),
      description: p.description ?? undefined,
    };
  } catch {
    return FALLBACK;
  }
}

/** Product link with campaign tags, so FUYL can attribute assessment sales. */
export function productLink(url: string, content: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "fuyl-assessment");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", "wellness-assessment");
  u.searchParams.set("utm_content", content);
  return u.toString();
}
