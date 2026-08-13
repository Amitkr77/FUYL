"use client";

import { useState } from "react";
import { Star, Check } from "lucide-react";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCartButton } from "./AddToCartButton";
import { BuyNowButton } from "./BuyNowButton";
import { WishlistButton } from "./WishlistButton";
import { PincodeCheck } from "./PincodeCheck";
import { ProductBadges } from "./ProductBadges";
import { VariantSelector } from "./VariantSelector";
import { SubscribeOption } from "./SubscribeOption";
import { formatPrice, discountPercent } from "@/lib/utils/formatPrice";
import { Badge } from "@/components/ui/Badge";
import type { Product } from "@/types/product";
import type { SubscriptionPlan } from "@/lib/api/subscriptionPlans";

interface ProductInfoProps {
  product: Product;
  plans?: SubscriptionPlan[];
}

export function ProductInfo({ product, plans }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  // Start on the first purchasable option. Selecting an out-of-stock first
  // variant makes an otherwise available product appear unavailable.
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants.find((candidate) => candidate.available && (candidate.availableQty ?? 1) > 0)
      ?? product.variants[0],
  );

  const variant = selectedVariant;

  if (!variant) return null;

  const compareAtPrice = variant.compareAtPrice ?? product.compareAtPrice;
  const savings = discountPercent(variant.price, compareAtPrice ?? 0);
  // Prefer the chosen variant's own weight; fall back to the product-level
  // shipping weight (see catalog/models/product.model.ts) for products with
  // no per-variant weight set.
  const netWeight = variant.weight ?? product.weight;
  const netWeightUnit = variant.weight
    ? variant.weightUnit
    : product.weightUnit;
  const netContent = netWeight ? `${netWeight} ${netWeightUnit ?? "g"}` : null;

  function handleVariantChange(v: typeof variant) {
    setSelectedVariant(v);
    // Reset quantity when switching variants so the user doesn't accidentally
    // try to add more units than the new variant has in stock.
    setQuantity(1);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Brand label — Teal */}
      <p className="text-label text-brand-teal">FUYL NUTRITION</p>

      {/* Title */}
      <h1 className="text-display-xl font-display text-brand-forest">
        {product.name}
      </h1>

      {/* Rating — guard on > 0, not just truthy: a rating of 0 (no reviews
          yet) is truthy-falsy in JS terms but `0 && (...)` still evaluates to
          0, and React renders that literal 0 instead of nothing. */}
      {product.rating != null && product.rating > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                className={
                  n <= Math.round(product.rating!)
                    ? "fill-amber-400 text-amber-400"
                    : "text-brand-border"
                }
              />
            ))}
          </div>
          <span className="text-body-sm font-semibold text-brand-forest">
            {product.rating}
          </span>
          {product.reviewCount != null && product.reviewCount > 0 && (
            <span className="text-body-xs text-brand-muted">
              ({product.reviewCount} reviews)
            </span>
          )}
        </div>
      )}

      <div>
        {/* Price — Forest Green featured pricing */}
        <div className="flex items-baseline gap-3">
          <span className="text-display-md font-display text-brand-forest">
            {formatPrice(variant.price)}
          </span>
          {compareAtPrice && (
            <>
              <span className="text-body-md line-through text-brand-muted">
                {formatPrice(compareAtPrice)}
              </span>
              {/* Forest Green savings badge — premium pricing highlight */}
              {savings && <Badge variant="berry">{savings}</Badge>}
            </>
          )}
        </div>

        {product.unitPrice && (
          <p className="text-body-xs text-brand-muted">
            {formatPrice(product.unitPrice.value)} {product.unitPrice.unit}
          </p>
        )}

        {product.additionalPrices.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {product.additionalPrices.map((p) => (
              <p key={p.label} className="text-body-xs text-brand-muted">
                {p.label}:{" "}
                <span className="font-medium text-brand-forest">
                  {formatPrice(p.price)}
                </span>
              </p>
            ))}
          </div>
        )}

        <p className="text-body-xs text-brand-muted">
          M.R.P. (Inclusive of all taxes)
        </p>

        {netContent && (
          <p className="text-body-xs text-brand-muted">Net Qty: {netContent}</p>
        )}
      </div>
      {product.shortDescription && (
        <p className="text-body-md text-brand-forest">
          {product.shortDescription}
        </p>
      )}

      {/* Badges */}
      <ProductBadges tags={product.tags} badge={product.badge} />

      {/* Variant selector — only rendered when the product has multiple variants */}
      {product.variants.length > 1 && (
        <VariantSelector
          variants={product.variants}
          selectedId={variant.id}
          onChange={handleVariantChange}
        />
      )}

      {/* Qty + ATC */}
      <div className="flex flex-col gap-3 pt-2">
        {/* Low-stock warning — shown when ≤5 units remain */}
        {variant.availableQty !== undefined && variant.availableQty <= 5 && variant.availableQty > 0 && (
          <p className="text-body-xs text-amber-600 font-medium">
            Only {variant.availableQty} left in stock
          </p>
        )}
        <div className="flex items-center gap-4">
          <span className="text-label text-brand-muted">Quantity</span>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={variant.availableQty ?? 10}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <AddToCartButton
              product={product}
              variant={variant}
              quantity={quantity}
            />
          </div>
          <WishlistButton
            productId={product.id}
            variantId={variant.id || undefined}
          />
        </div>
        <BuyNowButton product={product} variant={variant} quantity={quantity} />
        <PincodeCheck />
      </div>

      {/* Subscribe & Save — shown inline here (not via a separate server component
          in page.tsx) so the selected variant's id can be forwarded automatically. */}
      {product.isSubscribable && plans && plans.length > 0 && (
        <SubscribeOption
          productId={product.id}
          variantId={variant.id || undefined}
          plans={plans}
        />
      )}

      {/* Benefits grid — premium 2x2 trust tiles, sourced from real product data */}
      {product.benefits.length > 0 && (
        <div className="grid grid-cols-2 gap-3 border-t border-brand-border pt-5">
          {product.benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-cream/50 p-4 transition-shadow duration-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-sage/70">
                <Check size={17} className="text-brand-forest" />
              </span>
              <span className="text-body-sm font-medium leading-snug text-brand-forest">
                {benefit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Money-back guarantee */}
      {/* <p className="text-body-xs p-3 rounded-sm text-center font-medium bg-brand-cream text-brand-muted">
        30-Day Money-Back Guarantee · If you don't feel the difference, we'll
        refund you.
      </p> */}
    </div>
  );
}
