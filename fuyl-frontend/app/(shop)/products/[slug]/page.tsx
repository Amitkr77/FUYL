import { generateSEO } from '@/lib/utils/seo'
import { getProduct } from '@/lib/api/products'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductInfo } from '@/components/product/ProductInfo'
import { ProductTabs } from '@/components/product/ProductTabs'
import { ReviewsWidget } from '@/components/product/ReviewsWidget'
import type { Product } from '@/types/product'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const product = await getProduct(slug)
    return generateSEO({
      title:       product.name,
      description: product.seoDescription,
      image:       product.images[0]?.url,
      url:         `https://fuyl.in/products/${slug}`,
    })
  } catch {
    return generateSEO({ title: 'Product' })
  }
}

// Fallback product for when backend isn't ready yet
const FALLBACK_PRODUCT: Product = {
  id:             'fuyl-complete',
  slug:           'fuyl-complete',
  name:           'FUYL COMPLETE+',
  title:          'FUYL COMPLETE+',
  description:    '<p>60+ premium ingredients in one daily sachet. Covers gut health, energy, immunity, liver support, stress, antioxidants and more. Made in India, research-backed, free from artificial colours and flavours.</p>',
  seoDescription: 'Complete daily nutrition powder — 60+ research-backed ingredients in one sachet.',
  price:          1499,
  compareAtPrice: 1799,
  badge:          'Best Seller',
  available:      true,
  rating:         4.8,
  reviewCount:    247,
  tags:           ['vegetarian', 'free-shipping', 'made-in-india'],
  images: [
    { id: '1', url: 'https://fuyl.in/cdn/shop/files/FUYL_Complete_Product_Shot.jpg', altText: 'FUYL COMPLETE+ sachet', width: 800, height: 800 },
  ],
  variants: [
    { id: 'v1', title: 'Mixed Berry · 15 Sachets', price: 1499, compareAtPrice: 1799, available: true, sku: 'FUYL-COMP-001' },
  ],
}

const FALLBACK_REVIEWS = [
  { id: '1', author: 'Priya S.', rating: 5, date: 'May 2025', body: 'I have been taking FUYL for 3 months now. My energy levels are noticeably better and my digestion has improved significantly.', verified: true },
  { id: '2', author: 'Rahul M.', rating: 5, date: 'April 2025', body: 'Finally a supplement brand that is transparent about what\'s in it. The taste is great too — doesn\'t taste like medicine at all.', verified: true },
  { id: '3', author: 'Dr. Anita K.', rating: 5, date: 'March 2025', body: 'As a nutritionist I am impressed by the ingredient quality and clinical backing. I now recommend FUYL to my clients.', verified: false },
]

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  let product: Product = FALLBACK_PRODUCT
  try {
    product = await getProduct(slug)
  } catch {
    // Use fallback while backend is being built
  }

  return (
    <div className="container-brand section-py">
      {/* PDP grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} productName={product.name} />
        <ProductInfo product={product} />
      </div>

      {/* Tabs */}
      <ProductTabs product={product} />

      {/* Reviews */}
      <ReviewsWidget
        reviews={FALLBACK_REVIEWS}
        averageRating={product.rating ?? 4.8}
        totalCount={product.reviewCount ?? 0}
      />
    </div>
  )
}
