import { notFound } from 'next/navigation'
import { generateSEO } from '@/lib/utils/seo'
import { getProduct, getProductReviews, type ReviewCard } from '@/lib/api/products'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductInfo } from '@/components/product/ProductInfo'
import { ProductTabs } from '@/components/product/ProductTabs'
import { ReviewsWidget } from '@/components/product/ReviewsWidget'
import { DeliveryInfo } from '@/components/product/DeliveryInfo'
import { CertificationMarquee } from '@/components/product/CertificationMarquee'
import { FaqAccordion } from '@/components/product/FaqAccordion'
import { RecommendedProducts } from '@/components/product/RecommendedProducts'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
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

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  // BUG FIXED (found live — this was reported as "add to cart isn't
  // working"): a failed product fetch (wrong/stale slug, product
  // unpublished, brief backend hiccup) used to silently render a
  // hardcoded fallback product with a fake variant id ("v1") instead of a
  // real one. The page looked completely normal, but "Add to Bag" always
  // failed — v1 isn't a real 24-character Mongo id, so the cart API
  // rejected it — and the button's own error handling (see
  // AddToCartButton.tsx) had the same silent-failure bug, so it showed
  // "Added to Bag" regardless. A real product that fails to load should
  // 404, not impersonate a working page.
  let product: Product
  try {
    product = await getProduct(slug)
  } catch {
    notFound()
  }

  let reviews: ReviewCard[] = []
  let averageRating = product.rating ?? 0
  let totalCount = product.reviewCount ?? 0
  try {
    const reviewData = await getProductReviews(product.id)
    reviews = reviewData.reviews
    averageRating = reviewData.averageRating
    totalCount = reviewData.totalCount
  } catch {
    // No reviews yet, or the reviews service hiccuped — not fatal to the page.
  }

  return (
    <>
    <div className="container-brand section-py">
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: 'Shop', href: '/collections/all' },
          { label: product.name },
        ]}
      />

      {/* PDP grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} productName={product.name} />
        <ProductInfo product={product} />
      </div>

      {/* Tabs */}
      <ProductTabs product={product} />

      {/* Reviews */}
      <ReviewsWidget
        reviews={reviews}
        averageRating={averageRating}
        totalCount={totalCount}
      />

      <div className="mt-10">
        <DeliveryInfo />
      </div>

      <div className="mt-10">
        <FaqAccordion faqs={product.faqs} />
      </div>

      <div className="mt-10">
        <RecommendedProducts excludeProductId={product.id} />
      </div>
    </div>

    <CertificationMarquee certifications={product.certifications} />
    </>
  )
}
