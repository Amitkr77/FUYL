import type { KnowledgeBase } from "@/engine";

export interface SyncedIngredientLite {
  matchedKeys: string[];
  image?: string;
}

/**
 * Overlay store data onto the knowledge base at read time. Only the IMAGE is
 * taken from fuyl.in: names, doses and every claim-bearing sentence stay as
 * reviewed in the KB. An ingredient keeps its existing image if the store has
 * none. Pure — returns a new KB, never mutates.
 */
export function applyStoreData(kb: KnowledgeBase, synced: SyncedIngredientLite[]): KnowledgeBase {
  const imageByKey = new Map<string, string>();
  for (const s of synced) {
    if (!s.image) continue;
    // A card shared by several keys (the enzyme blend) shares its image.
    for (const key of s.matchedKeys) if (!imageByKey.has(key)) imageByKey.set(key, s.image);
  }
  return {
    ...kb,
    ingredients: kb.ingredients.map((i) => (imageByKey.has(i.key) ? { ...i, image: imageByKey.get(i.key) } : i)),
  };
}
