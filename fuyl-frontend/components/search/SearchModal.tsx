"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, ArrowRight, FileText, Package, Newspaper, Leaf, HelpCircle } from "lucide-react";
import { globalSearch, type GlobalSearchResults } from "@/lib/api/search";
import { formatPrice } from "@/lib/utils/formatPrice";
import { Spinner } from "@/components/ui/Spinner";

const QUICK_LINKS = ["FUYL COMPLETE+", "Ashwagandha", "Probiotics", "Vitamin D3"];
const DEBOUNCE_MS = 220;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  // Guards against out-of-order responses clobbering newer ones.
  const reqId = useRef(0);

  const goToResults = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      onClose();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [onClose, router],
  );

  // Reset + focus when opened/closed.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    setQuery("");
    setResults(null);
    setLoading(false);
  }, [open]);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      const res = await globalSearch(q, { productLimit: 5, articleLimit: 3, pageLimit: 5 });
      if (id === reqId.current) {
        setResults(res);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults = results && results.total > 0;
  const showEmpty = results && results.total === 0 && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToResults(query);
          }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-border">
            <Search size={18} className="text-brand-muted shrink-0" />
            <input
              ref={inputRef}
              name="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, ingredients, articles…"
              className="flex-1 text-brand-forest placeholder:text-brand-muted text-base outline-none bg-transparent"
            />
            {loading && <Spinner size={16} className="text-brand-teal shrink-0" />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="text-brand-muted hover:text-brand-forest transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </form>

        {/* Body */}
        <div className="overflow-y-auto">
          {/* Idle — quick links */}
          {!query.trim() && (
            <div className="px-5 py-4">
              <p className="text-label text-brand-muted mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="px-5 py-10 text-center">
              <p className="text-body-sm text-brand-forest font-medium">
                No results for “{results!.query}”
              </p>
              <p className="text-body-xs text-brand-muted mt-1">
                Try a different term or browse the full range.
              </p>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div className="py-2">
              {results!.products.length > 0 && (
                <ResultGroup label="Products" icon={Package}>
                  {results!.products.map((p) => (
                    <ResultRow
                      key={p.id}
                      href={`/products/${p.slug}`}
                      onNavigate={onClose}
                      title={p.name}
                      subtitle={formatPrice(p.price)}
                      image={p.images[0]?.url}
                    />
                  ))}
                </ResultGroup>
              )}

              {results!.articles.length > 0 && (
                <ResultGroup label="Articles" icon={Newspaper}>
                  {results!.articles.map((a) => (
                    <ResultRow
                      key={a.id}
                      href={`/pages/learn/${a.slug}`}
                      onNavigate={onClose}
                      title={a.title}
                      subtitle={a.tags?.[0]}
                      image={a.image || undefined}
                    />
                  ))}
                </ResultGroup>
              )}

              {results!.ingredients.length > 0 && (
                <ResultGroup label="Ingredients" icon={Leaf}>
                  {results!.ingredients.map((ing) => (
                    <ResultRow
                      key={ing.id}
                      href="/pages/ingredients"
                      onNavigate={onClose}
                      title={ing.name}
                      subtitle={ing.benefit}
                      image={ing.image || undefined}
                    />
                  ))}
                </ResultGroup>
              )}

              {results!.faqs.length > 0 && (
                <ResultGroup label="FAQs" icon={HelpCircle}>
                  {results!.faqs.map((f) => (
                    <ResultRow
                      key={f.id}
                      href="/#faq"
                      onNavigate={onClose}
                      title={f.question}
                    />
                  ))}
                </ResultGroup>
              )}

              {results!.pages.length > 0 && (
                <ResultGroup label="Pages" icon={FileText}>
                  {results!.pages.map((pg) => (
                    <ResultRow
                      key={pg.href}
                      href={pg.href}
                      onNavigate={onClose}
                      title={pg.title}
                      subtitle={pg.description}
                    />
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>

        {/* Footer — see all */}
        {query.trim() && (
          <button
            type="button"
            onClick={() => goToResults(query)}
            className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-brand-border text-brand-forest hover:bg-brand-cream/60 transition-colors shrink-0"
          >
            <span className="text-body-sm font-medium">
              See all results for “{query.trim()}”
            </span>
            <ArrowRight size={16} className="text-brand-teal" />
          </button>
        )}
      </div>
    </div>
  );
}

function ResultGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-1.5 px-5 pb-1 pt-2">
        <Icon size={12} className="text-brand-muted" />
        <p className="text-label text-brand-muted">{label}</p>
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  href,
  title,
  subtitle,
  image,
  onNavigate,
}: {
  href: string;
  title: string;
  subtitle?: string;
  image?: string;
  onNavigate: () => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        router.push(href);
      }}
      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-brand-cream/60 transition-colors"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-brand-sage">
        {image && (
          <Image src={image} alt="" fill className="object-cover" sizes="40px" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-brand-forest truncate">{title}</p>
        {subtitle && (
          <p className="text-body-xs text-brand-muted truncate">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
