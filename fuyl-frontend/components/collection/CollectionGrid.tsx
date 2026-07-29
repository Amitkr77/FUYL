"use client";

import { useId, useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/types/product";

interface CollectionGridProps {
  products: Product[];
}

type SortKey = "featured" | "price-asc" | "price-desc" | "rating-desc" | "name-asc";

const SORT_LABEL: Record<SortKey, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "rating-desc": "Avg. Rating",
  "name-asc": "Name: A to Z",
};

export function CollectionGrid({ products }: CollectionGridProps) {
  const sortId = useId();
  const [sort, setSort] = useState<SortKey>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Every tag present across the set, in first-seen order — becomes the
  // filter-chip list. Only rendered when there's more than one to choose from.
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) for (const t of p.tags) seen.add(t);
    return Array.from(seen);
  }, [products]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const filtered = useMemo(() => {
    let list = products;
    if (inStockOnly) list = list.filter((p) => p.available);
    if (activeTags.length) list = list.filter((p) => activeTags.every((t) => p.tags.includes(t)));

    // "featured" keeps the server's original order (newest-first from the
    // backend) rather than re-sorting — everything else sorts a copy.
    if (sort === "featured") return list;
    const sorted = [...list];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "rating-desc": sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return sorted;
  }, [products, sort, inStockOnly, activeTags]);

  if (!products.length) {
    return (
      <div className="py-20 text-center">
        <p className="text-body-lg" style={{ color: "var(--color-brand-muted)" }}>
          No products here yet — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {allTags.length > 1 && (
            <>
              {allTags.map((tag) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className="h-9 px-3.5 rounded-full text-body-xs font-semibold uppercase tracking-wide border transition-colors"
                    style={
                      active
                        ? { background: "var(--color-brand-forest)", color: "#fff", borderColor: "var(--color-brand-forest)" }
                        : { color: "var(--color-brand-muted)", borderColor: "var(--color-brand-border)" }
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </>
          )}
          <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-body-xs font-semibold uppercase tracking-wide border cursor-pointer"
            style={{ color: "var(--color-brand-muted)", borderColor: "var(--color-brand-border)" }}
          >
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            In stock only
          </label>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor={sortId} className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-brand-muted)" }}>
            Sort
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 pl-3 pr-8 rounded-sm text-body-sm border bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            style={{ borderColor: "var(--color-brand-border)", color: "var(--color-brand-forest)" }}
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>{SORT_LABEL[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body-md" style={{ color: "var(--color-brand-muted)" }}>
            No products match these filters.
          </p>
          <button
            type="button"
            onClick={() => { setInStockOnly(false); setActiveTags([]); }}
            className="mt-3 text-body-sm font-semibold text-brand-teal hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
