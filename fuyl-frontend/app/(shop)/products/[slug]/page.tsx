import { notFound } from "next/navigation";
import { generateSEO } from "@/lib/utils/seo";
import {
  getProduct,
  getProductReviews,
  getProductStock,
  type ReviewCard,
} from "@/lib/api/products";
import {
  getActivePlans,
  type SubscriptionPlan,
} from "@/lib/api/subscriptionPlans";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ReviewsWidget } from "@/components/product/ReviewsWidget";
import { CertificationMarquee } from "@/components/product/CertificationMarquee";
import { ProductInfoBlocks } from "@/components/product/ProductInfoBlocks";
import { FaqAccordion } from "@/components/product/FaqAccordion";
import { RecommendedProducts } from "@/components/product/RecommendedProducts";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import type { Product } from "@/types/product";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return generateSEO({
      title: product.name,
      description: product.seoDescription,
      image: product.images[0]?.url,
      url: `https://fuyl.in/products/${slug}`,
    });
  } catch {
    return generateSEO({ title: "Product" });
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

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
  let product: Product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  // Fetch live inventory for every variant in parallel so the quantity
  // selector can cap at the real available stock for whichever variant the
  // customer picks. Failures are non-fatal — the selector just shows no cap.
  try {
    const stockResults = await Promise.allSettled(
      product.variants.map((v) =>
        getProductStock(product.id, v.id || undefined)
      )
    );
    product.variants = product.variants.map((v, i) => {
      const result = stockResults[i];
      if (result.status === "fulfilled" && result.value !== null) {
        return { ...v, available: v.available && result.value > 0, availableQty: result.value };
      }
      // Stock must be explicitly configured before an item can be purchased;
      // the cart API enforces the same rule authoritatively.
      return { ...v, available: false, availableQty: 0 };
    });
  } catch {
    // If stock fetches fail, the product page still renders — just with no qty cap.
  }

  // Subscription plans are platform-wide; only offered for subscribable products.
  let plans: SubscriptionPlan[] = [];
  if (product.isSubscribable) {
    try {
      plans = await getActivePlans();
    } catch {
      /* plans unavailable — hide the option */
    }
  }

  let reviews: ReviewCard[] = [];
  let averageRating = product.rating ?? 0;
  let totalCount = product.reviewCount ?? 0;
  try {
    const reviewData = await getProductReviews(product.id);
    reviews = reviewData.reviews;
    averageRating = reviewData.averageRating;
    totalCount = reviewData.totalCount;
  } catch {
    // No reviews yet, or the reviews service hiccuped — not fatal to the page.
  }

  return (
    <>
      <div className="container-brand mx-auto mt-10 ">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Shop", href: "/collections/all" },
            { label: product.name },
          ]}
        />

        {/* PDP grid — items-start keeps each column its own natural height;
            without it, CSS Grid's default stretch forces the gallery to
            match the (taller, growing) info column's height, squashing its
            aspect-square image cells and widening the gaps between them. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* Sticky on desktop — stays in view while the info column (which
              can grow much taller) scrolls past, then scrolls away normally
              once the info column ends. */}
          <div className="lg:sticky lg:top-24">
            <ProductGallery
              images={product.images}
              productName={product.name}
            />
          </div>
          <div>
            {/* Plans are passed down so ProductInfo can forward the currently
                selected variant's id to SubscribeOption — the old architecture
                passed product.variants[0].id unconditionally, which meant
                subscribing always used the first variant regardless of what
                the customer had chosen. */}
            <ProductInfo product={product} plans={plans} />
          </div>
        </div>

        {/* Full-bleed: break out of container-brand's max-width so the marquee
            spans the entire viewport width, without changing its position in
            the flow. */}
        <div className="w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]">
          <CertificationMarquee certifications={product.certifications} />
        </div>

        {/* Tabs */}
        <ProductTabs
          product={product}
          descriptionHtml={sanitizeHtml(product.description)}
        />

        {/* Reviews */}
        <ReviewsWidget
          reviews={reviews}
          averageRating={averageRating}
          totalCount={totalCount}
        />

        <div className="mt-10">
          <ProductInfoBlocks blocks={product.infoBlocks} />
        </div>

        <div className="mt-10">
          <FaqAccordion faqs={product.faqs} />
        </div>

        <div className="mt-10">
          <RecommendedProducts excludeProductId={product.id} />
        </div>
      </div>
    </>
  );
}
