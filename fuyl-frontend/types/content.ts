export interface CMSPage {
  id: string
  slug: string
  title: string
  body: string // HTML string from backend
  seoTitle?: string
  seoDescription?: string
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  author: string
  publishedAt: string
  image: string
  imageAlt: string
  tags: string[]
  readTime: number // minutes
}

export interface Ingredient {
  id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image: string
  category: 'greens' | 'berries' | 'adaptogens' | 'probiotics' | 'vitamins' | 'omegas' | 'enzymes' | 'antioxidants'
  clinicalBacking?: string
}

export interface Testimonial {
  id: string
  name: string
  title?: string    // e.g. "Nutritionist" for experts
  type: 'expert' | 'customer'
  body: string
  rating?: number
  image?: string
}

export interface FAQ {
  id: string
  question: string
  answer: string
}
