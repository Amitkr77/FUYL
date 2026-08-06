"use client";

import { useId, useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/types/product";

interface CollectionGridProps {
  products: Product[];
}

type SortKey = "featured" | "price-asc" | "price-desc" | "rating-desc" | "name-asc";
type ViewMode = "grid" | "list";

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
  // Desktop-only choice — mobile/tablet always render the grid regardless of
  // this (see the render section below), so it defaults to "grid" and the
  // toggle itself is hidden below lg: since there's nothing to choose there.
  const [view, setView] = useState<ViewMode>("grid");
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
  }, [products, sort, activeTags]);

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
      <div className="flex flex-col gap-3 mb-8">
        {/* Tag filter chips (left) + sort (right), always one line — tags
            wrap within their own flex-wrap container so a long tag list
            can never push sort onto a second line. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grid / list toggle — desktop only, mobile/tablet has no choice */}
            <div
              className="hidden shrink-0 items-center gap-0.5 rounded-full border p-0.5 lg:flex"
              style={{ borderColor: "var(--color-brand-border)" }}
              role="group"
              aria-label="Layout"
            >
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                style={
                  view === "grid"
                    ? { background: "var(--color-brand-forest)", color: "#fff" }
                    : { color: "var(--color-brand-muted)" }
                }
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="List view"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                style={
                  view === "list"
                    ? { background: "var(--color-brand-forest)", color: "#fff" }
                    : { color: "var(--color-brand-muted)" }
                }
              >
                <List size={15} />
              </button>
            </div>

            {allTags.length > 1 &&
              allTags.map((tag) => {
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
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor={sortId} className="hidden sm:inline text-body-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-brand-muted)" }}>
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
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body-md" style={{ color: "var(--color-brand-muted)" }}>
            No products match these filters.
          </p>
          <button
            type="button"
            onClick={() => setActiveTags([])}
            className="mt-3 text-body-sm font-semibold text-brand-teal hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile/tablet always render this — regardless of `view` —
              since the toggle itself is hidden below lg:. On desktop it
              only shows when view is "grid" (view "list" hides it here and
              shows the list block below instead). */}
          <div
            className={cn(
              "grid grid-cols-1 gap-8 sm:grid-cols-2",
              view === "list" ? "lg:hidden" : "lg:grid-cols-3 lg:gap-8",
            )}
          >
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Desktop list rows — only when the toggle is set to "list"; the
              "hidden lg:flex" (not just "flex") also guarantees this never
              shows on mobile/tablet even if `view` happens to be "list"
              (e.g. after resizing down from a desktop list-view session). */}
          {view === "list" && (
            <div className="hidden flex-col gap-4 lg:flex">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} layout="list" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
