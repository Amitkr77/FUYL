import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { globalSearch } from '@/lib/api/search'
import { formatPrice } from '@/lib/utils/formatPrice'
import { BlogPostCard } from '@/components/content/BlogPostCard'
import type { Product } from '@/types/product'

interface Props { searchParams: Promise<{ q?: string | string[] }> }

export async function generateMetadata({ searchParams }: Props) {
  const value = (await searchParams).q
  const query = (Array.isArray(value) ? value[0] : value)?.trim()
  return {
    title: query ? `Search results for ${query} | FUYL` : 'Search | FUYL',
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const value = (await searchParams).q
  const query = ((Array.isArray(value) ? value[0] : value) ?? '').trim().slice(0, 100)
  const results = query
    ? await globalSearch(query, { productLimit: 24, articleLimit: 12, pageLimit: 10 })
    : null

  return (
    <div className="container-brand section-py">
      <form action="/search" method="get" role="search" className="max-w-2xl">
        <label htmlFor="site-search" className="sr-only">Search FUYL</label>
        <div className="flex h-13 items-center gap-3 rounded-full border border-brand-border bg-white px-4 transition-colors focus-within:border-brand-teal">
          <Search size={18} className="shrink-0 text-brand-muted" aria-hidden="true" />
          <input id="site-search" name="q" type="search" defaultValue={query} maxLength={100} autoFocus
            placeholder="Search products, ingredients, articles…"
            className="h-full flex-1 bg-transparent text-base text-brand-forest outline-none placeholder:text-brand-muted" />
          <button type="submit" className="text-body-xs font-semibold uppercase tracking-wide text-brand-teal">Search</button>
        </div>
      </form>

      <div className="mb-8 mt-6">
        {query ? (
          <h1 className="text-display-md font-display text-brand-forest">
            {results?.total ?? 0} result{results?.total === 1 ? '' : 's'} for “{query}”
          </h1>
        ) : (
          <p className="text-body-md text-brand-muted">Search across products, ingredients, articles, FAQs, and pages.</p>
        )}
      </div>

      {query && results?.total === 0 && (
        <div className="py-16 text-center">
          <p className="text-body-lg font-medium text-brand-forest">No results found</p>
          <p className="mt-2 text-body-sm text-brand-muted">Try another term, or{' '}
            <Link href="/collections/all" className="text-brand-teal underline">browse the full range</Link>.
          </p>
        </div>
      )}

      {results && results.total > 0 && (
        <div className="space-y-14">
          {results.products.length > 0 && (
            <section>
              <SectionHeading title="Products" count={results.products.length} />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {results.products.map((product) => <ProductResult key={product.id} product={product} />)}
              </div>
            </section>
          )}

          {results.articles.length > 0 && (
            <section>
              <SectionHeading title="Articles" count={results.articles.length} />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {results.articles.map((article) => <BlogPostCard key={article.id} post={article} />)}
              </div>
            </section>
          )}

          {results.ingredients.length > 0 && (
            <section>
              <SectionHeading title="Ingredients" count={results.ingredients.length} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.ingredients.map((ingredient) => (
                  <Link key={ingredient.id} href="/pages/ingredients" className="group flex items-center gap-3 rounded-xl border border-brand-border p-3 transition-colors hover:border-brand-teal hover:bg-brand-cream/50">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-brand-sage">
                      {ingredient.image && <Image src={ingredient.image} alt="" fill sizes="48px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-brand-forest transition-colors group-hover:text-brand-teal">{ingredient.name}</p>
                      <p className="line-clamp-1 text-body-xs text-brand-muted">{ingredient.benefit}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.faqs.length > 0 && (
            <section>
              <SectionHeading title="FAQs" count={results.faqs.length} />
              <div className="space-y-3">
                {results.faqs.map((faq) => (
                  <div key={faq.id} className="rounded-xl border border-brand-border p-4">
                    <p className="text-body-md font-semibold text-brand-forest">{faq.question}</p>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-brand-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.pages.length > 0 && (
            <section>
              <SectionHeading title="Pages" count={results.pages.length} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.pages.map((page) => (
                  <Link key={page.href} href={page.href} className="group block rounded-xl border border-brand-border p-4 transition-colors hover:border-brand-teal hover:bg-brand-cream/50">
                    <p className="text-body-md font-semibold text-brand-forest transition-colors group-hover:text-brand-teal">{page.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-body-sm text-brand-muted">{page.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return <div className="mb-5 flex items-baseline gap-3 border-b border-brand-border pb-3">
    <h2 className="text-display-sm font-display uppercase tracking-wide text-brand-forest">{title}</h2>
    <span className="text-body-sm text-brand-muted">{count}</span>
  </div>
}

function ProductResult({ product }: { product: Product }) {
  const image = product.images[0]
  return <Link href={`/products/${product.slug}`} className="group flex flex-col">
    <div className="relative aspect-square overflow-hidden rounded-sm bg-brand-sage">
      {image && <Image src={image.url} alt={image.altText || product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />}
    </div>
    <p className="mt-3 line-clamp-2 text-body-sm font-semibold text-brand-forest transition-colors group-hover:text-brand-teal">{product.name}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <span className="text-body-md font-semibold text-brand-forest">{formatPrice(product.price)}</span>
      {product.compareAtPrice && <span className="text-body-sm text-brand-muted line-through">{formatPrice(product.compareAtPrice)}</span>}
    </div>
  </Link>
}
