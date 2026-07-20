"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { globalSearch, type GlobalSearchResults } from "@/lib/api/search";
import { formatPrice } from "@/lib/utils/formatPrice";
import { BlogPostCard } from "@/components/content/BlogPostCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Product } from "@/types/product";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const [input, setInput] = useState(query);
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // Keep the input in sync when the URL query changes (e.g. from the modal).
  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    if (!query) {
      setResults(null);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    globalSearch(query, { productLimit: 24, articleLimit: 12, pageLimit: 10 }).then(
      (res) => {
        if (id === reqId.current) {
          setResults(res);
          setLoading(false);
        }
      },
    );
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="container-brand section-py">
      {/* Search field */}
      <form onSubmit={submit} className="max-w-2xl">
        <div className="flex items-center gap-3 h-13 px-4 rounded-full border border-brand-border bg-white focus-within:border-brand-teal transition-colors">
          <Search size={18} className="text-brand-muted shrink-0" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder="Search products, ingredients, articles…"
            className="flex-1 h-full text-brand-forest placeholder:text-brand-muted text-base outline-none bg-transparent"
          />
        </div>
      </form>

      {/* Status line */}
      <div className="mt-6 mb-8">
        {query ? (
          <h1 className="text-display-md font-display text-brand-forest">
            {loading
              ? "Searching…"
              : `${results?.total ?? 0} result${results?.total === 1 ? "" : "s"} for “${query}”`}
          </h1>
        ) : (
          <p className="text-body-md text-brand-muted">
            Type above to search across products, ingredients, articles, and pages.
          </p>
        )}
      </div>

      {loading && (
        <div className="py-20 text-center">
          <Spinner size={28} className="text-brand-forest mx-auto" />
        </div>
      )}

      {!loading && query && results && results.total === 0 && (
        <div className="py-16 text-center">
          <p className="text-body-lg text-brand-forest font-medium">
            No results found
          </p>
          <p className="text-body-sm text-brand-muted mt-2">
            Try a different term, or{" "}
            <Link href="/collections/all" className="text-brand-teal underline">
              browse the full range
            </Link>
            .
          </p>
        </div>
      )}

      {!loading && results && results.total > 0 && (
        <div className="space-y-14">
          {/* Products */}
          {results.products.length > 0 && (
            <section>
              <SectionHeading title="Products" count={results.products.length} />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {results.products.map((p) => (
                  <ProductResult key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Articles */}
          {results.articles.length > 0 && (
            <section>
              <SectionHeading title="Articles" count={results.articles.length} />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {results.articles.map((a) => (
                  <BlogPostCard key={a.id} post={a} />
                ))}
              </div>
            </section>
          )}

          {/* Ingredients */}
          {results.ingredients.length > 0 && (
            <section>
              <SectionHeading title="Ingredients" count={results.ingredients.length} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.ingredients.map((ing) => (
                  <Link
                    key={ing.id}
                    href="/pages/ingredients"
                    className="group flex items-center gap-3 rounded-xl border border-brand-border p-3 transition-colors hover:border-brand-teal hover:bg-brand-cream/50"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-brand-sage">
                      {ing.image && (
                        <Image src={ing.image} alt="" fill className="object-cover" sizes="48px" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-semibold text-brand-forest group-hover:text-brand-teal transition-colors truncate">
                        {ing.name}
                      </p>
                      <p className="text-body-xs text-brand-muted line-clamp-1">{ing.benefit}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQs — answers shown inline (no dedicated FAQ page to link to) */}
          {results.faqs.length > 0 && (
            <section>
              <SectionHeading title="FAQs" count={results.faqs.length} />
              <div className="space-y-3">
                {results.faqs.map((f) => (
                  <div key={f.id} className="rounded-xl border border-brand-border p-4">
                    <p className="text-body-md font-semibold text-brand-forest">{f.question}</p>
                    <p className="text-body-sm text-brand-muted mt-1.5 leading-relaxed">
                      {f.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pages */}
          {results.pages.length > 0 && (
            <section>
              <SectionHeading title="Pages" count={results.pages.length} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.pages.map((pg) => (
                  <Link
                    key={pg.href}
                    href={pg.href}
                    className="group block rounded-xl border border-brand-border p-4 transition-colors hover:border-brand-teal hover:bg-brand-cream/50"
                  >
                    <p className="text-body-md font-semibold text-brand-forest group-hover:text-brand-teal transition-colors">
                      {pg.title}
                    </p>
                    <p className="text-body-sm text-brand-muted mt-0.5 line-clamp-1">
                      {pg.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-5 border-b border-brand-border pb-3">
      <h2 className="text-display-sm font-display text-brand-forest uppercase tracking-wide">
        {title}
      </h2>
      <span className="text-body-sm text-brand-muted">{count}</span>
    </div>
  );
}

function ProductResult({ product }: { product: Product }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-square rounded-sm overflow-hidden bg-brand-sage">
        {image && (
          <Image
            src={image.url}
            alt={image.altText || product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        )}
      </div>
      <p className="mt-3 text-body-sm font-semibold text-brand-forest group-hover:text-brand-teal transition-colors line-clamp-2">
        {product.name}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-body-md font-semibold text-brand-forest">
          {formatPrice(product.price)}
        </span>
        {product.compareAtPrice && (
          <span className="text-body-sm line-through text-brand-muted">
            {formatPrice(product.compareAtPrice)}
          </span>
        )}
      </div>
    </Link>
  );
}
