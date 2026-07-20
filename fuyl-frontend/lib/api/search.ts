import { searchProducts } from './products'
import { searchPosts, getIngredients, getFAQs } from './content'
import { searchStaticPages, type SearchablePage } from '@/lib/constants/searchIndex'
import type { Product } from '@/types/product'
import type { BlogPost, Ingredient, FAQ } from '@/types/content'

export interface GlobalSearchResults {
  query: string
  products: Product[]
  articles: BlogPost[]
  ingredients: Ingredient[]
  faqs: FAQ[]
  pages: SearchablePage[]
  total: number
}

const EMPTY: Omit<GlobalSearchResults, 'query'> = {
  products: [],
  articles: [],
  ingredients: [],
  faqs: [],
  pages: [],
  total: 0,
}

// Ingredients and FAQs are small, static, fully-cached lists — fetch the whole
// set once per session and filter in-memory instead of hitting a search
// endpoint on every keystroke. The memoized promise dedupes concurrent calls.
let ingredientsCache: Promise<Ingredient[]> | null = null
let faqsCache: Promise<FAQ[]> | null = null
const loadIngredients = () => (ingredientsCache ??= getIngredients().catch(() => []))
const loadFaqs = () => (faqsCache ??= getFAQs().catch(() => []))

function matchIngredients(all: Ingredient[], q: string, limit: number): Ingredient[] {
  const scored = all
    .map((ing) => {
      const name = ing.name.toLowerCase()
      const hay = [ing.name, ing.benefit, ing.description, ing.category].join(' ').toLowerCase()
      let score = -1
      if (name.startsWith(q)) score = 3
      else if (name.includes(q)) score = 2
      else if (hay.includes(q)) score = 1
      return { ing, score }
    })
    .filter((r) => r.score > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((r) => r.ing)
}

function matchFaqs(all: FAQ[], q: string, limit: number): FAQ[] {
  return all
    .filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    )
    .slice(0, limit)
}

/**
 * Site-wide search. Fans out to the product and article search endpoints and
 * the ingredient/FAQ lists in parallel, matches the static page index locally,
 * then returns every group together. Sources fail soft (return []) so one
 * slow/broken source never sinks the whole result set.
 */
export async function globalSearch(
  query: string,
  opts: {
    productLimit?: number
    articleLimit?: number
    ingredientLimit?: number
    faqLimit?: number
    pageLimit?: number
  } = {},
): Promise<GlobalSearchResults> {
  const q = query.trim()
  if (!q) return { query: q, ...EMPTY }

  const {
    productLimit = 8,
    articleLimit = 6,
    ingredientLimit = 6,
    faqLimit = 5,
    pageLimit = 6,
  } = opts
  const lower = q.toLowerCase()

  const [products, articles, allIngredients, allFaqs] = await Promise.all([
    searchProducts(q, productLimit),
    searchPosts(q, articleLimit),
    loadIngredients(),
    loadFaqs(),
  ])

  const ingredients = matchIngredients(allIngredients, lower, ingredientLimit)
  const faqs = matchFaqs(allFaqs, lower, faqLimit)
  const pages = searchStaticPages(q, pageLimit)

  return {
    query: q,
    products,
    articles,
    ingredients,
    faqs,
    pages,
    total:
      products.length +
      articles.length +
      ingredients.length +
      faqs.length +
      pages.length,
  }
}
